package com.warraich.devicelock

import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.io.File
import java.io.IOException
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread
import java.nio.file.Files
import kotlin.random.Random

class DownloaderTest {
    private val body = Random(7).nextBytes(900_000)
    private lateinit var server: ServerSocket
    private lateinit var dir: File
    private val ranges = mutableListOf<String?>()

    /** Per request: "drop" = send 40% then close, "stall" = send 40% then hang, "ok" = serve normally. */
    private var plan = ArrayDeque<String>()
    private var honourRange = true

    @Before fun setUp() {
        dir = Files.createTempDirectory("upd").toFile()
        server = ServerSocket(0)
        thread(isDaemon = true) {
            while (!server.isClosed) {
                val sock = runCatching { server.accept() }.getOrNull() ?: break
                thread(isDaemon = true) { serve(sock) }
            }
        }
    }

    private fun serve(sock: Socket) = sock.use {
        val reader = sock.getInputStream().bufferedReader()
        reader.readLine() ?: return
        var range: String? = null
        while (true) {
            val h = reader.readLine() ?: return
            if (h.isEmpty()) break
            if (h.startsWith("Range:", ignoreCase = true)) range = h.substringAfter(':').trim()
        }
        val mode = synchronized(this) { ranges += range; plan.removeFirstOrNull() ?: "ok" }
        val from = if (honourRange && range != null) range.removePrefix("bytes=").removeSuffix("-").toInt() else 0
        val slice = body.copyOfRange(from, body.size)
        val nl = "\r\n"
        val head = StringBuilder(if (from > 0) "HTTP/1.1 206 Partial Content$nl" else "HTTP/1.1 200 OK$nl")
        if (from > 0) head.append("Content-Range: bytes $from-${body.size - 1}/${body.size}$nl")
        head.append("Content-Length: ${slice.size}${nl}Connection: close$nl$nl")
        val out = sock.getOutputStream()
        out.write(head.toString().toByteArray())
        val cut = (slice.size * 0.4).toInt()
        when (mode) {
            "drop" -> { out.write(slice, 0, cut); out.flush() }
            "stall" -> { out.write(slice, 0, cut); out.flush(); Thread.sleep(1500) }
            else -> { out.write(slice); out.flush() }
        }
    }

    @After fun tearDown() { server.close(); dir.deleteRecursively() }

    private val url get() = "http://127.0.0.1:${server.localPort}/a.apk"

    @Test fun clean_download() {
        val f = Downloader.fetch(dir, 18, url)
        assertArrayEquals(body, f.readBytes())
        assertEquals(listOf<String?>(null), ranges)
    }

    @Test fun dropped_connections_resume_instead_of_restarting() {
        plan = ArrayDeque(listOf("drop", "drop"))
        val f = Downloader.fetch(dir, 18, url)
        assertArrayEquals(body, f.readBytes())
        assertEquals(3, ranges.size)
        assertEquals(null, ranges[0])
        assertTrue(ranges[1]!!.startsWith("bytes=") && ranges[2]!! > ranges[1]!!)
        assertFalse(File(dir, "update-18.part").exists())
    }

    @Test fun stalled_read_times_out_then_resumes() {
        plan = ArrayDeque(listOf("stall"))
        val f = Downloader.fetch(dir, 18, url, readTimeoutMs = 500)
        assertArrayEquals(body, f.readBytes())
        assertTrue(ranges[1]!!.startsWith("bytes="))
    }

    @Test fun progress_survives_between_runs() {
        plan = ArrayDeque(listOf("drop"))
        try { Downloader.fetch(dir, 18, url, tries = 1); fail("should not finish") } catch (_: IOException) {}
        val part = File(dir, "update-18.part")
        assertTrue(part.length() in 1 until body.size)
        val f = Downloader.fetch(dir, 18, url, tries = 1)
        assertArrayEquals(body, f.readBytes())
        assertEquals("bytes=${(body.size * 0.4).toInt()}-", ranges[1])
    }

    @Test fun server_ignoring_range_restarts_cleanly() {
        honourRange = false
        plan = ArrayDeque(listOf("drop"))
        val f = Downloader.fetch(dir, 18, url)
        assertArrayEquals(body, f.readBytes())
    }

    @Test fun finished_file_is_reused_and_old_versions_removed() {
        File(dir, "update-17.apk").writeText("old"); File(dir, "update-16.part").writeText("old")
        Downloader.fetch(dir, 18, url)
        Downloader.fetch(dir, 18, url)
        assertEquals(1, ranges.size)
        assertFalse(File(dir, "update-17.apk").exists()); assertFalse(File(dir, "update-16.part").exists())
    }

    @Test fun gives_up_after_tries_with_progress_in_message() {
        plan = ArrayDeque(listOf("drop", "drop"))
        try { Downloader.fetch(dir, 18, url, tries = 2); fail("should not finish") }
        catch (e: IOException) { assertTrue(e.message!!.contains("KB of update downloaded")) }
    }
}
