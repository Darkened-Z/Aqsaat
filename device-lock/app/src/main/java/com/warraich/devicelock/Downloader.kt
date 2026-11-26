package com.warraich.devicelock

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Fetches update-<ver>.apk into [dir]. Bytes already on disk are kept between tries
 * and between runs (HTTP Range), so a connection that keeps dropping still finishes.
 * Plain java.net so it runs in JVM unit tests.
 */
object Downloader {
    fun fetch(dir: File, ver: Int, url: String, tries: Int = 4, readTimeoutMs: Int = 120_000): File {
        val done = File(dir, "update-$ver.apk")
        if (done.exists()) return done
        dir.listFiles()?.filter { it.name.startsWith("update-") && !it.name.startsWith("update-$ver.") }?.forEach { it.delete() }
        val part = File(dir, "update-$ver.part")
        var last: IOException? = null
        repeat(tries) {
            try {
                if (once(part, url, readTimeoutMs)) {
                    if (!part.renameTo(done)) throw IOException("rename failed")
                    return done
                }
            } catch (e: IOException) { last = e }
        }
        throw IOException("${part.length() / 1024}KB of update downloaded; ${last?.javaClass?.simpleName}: ${last?.message}", last)
    }

    /** One request; true when the file is complete. */
    private fun once(part: File, url: String, readTimeoutMs: Int): Boolean {
        val have = part.length()
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 30_000; readTimeout = readTimeoutMs
            setRequestProperty("Accept-Encoding", "identity")
            if (have > 0) setRequestProperty("Range", "bytes=$have-")
        }
        try {
            val code = conn.responseCode
            if (code == 416) { part.delete(); return false }
            if (code !in 200..299) throw IOException("HTTP $code")
            val append = code == 206
            val total = if (append) conn.getHeaderField("Content-Range")?.substringAfter('/')?.toLongOrNull() ?: -1L
                        else conn.contentLengthLong
            if (append && conn.getHeaderField("Content-Range")?.startsWith("bytes $have-") != true) {
                part.delete(); return false
            }
            FileOutputStream(part, append).use { out -> conn.inputStream.use { it.copyTo(out, 64 * 1024) } }
            if (total > 0 && part.length() != total) {
                if (part.length() > total) part.delete()
                throw IOException("short download ${part.length()}/$total")
            }
            return true
        } finally { conn.disconnect() }
    }
}
