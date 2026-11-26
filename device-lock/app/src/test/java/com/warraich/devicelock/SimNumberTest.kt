package com.warraich.devicelock

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SimNumberTest {
    @Test fun reads_number_in_every_common_format() {
        assertEquals("03156230514", SimNumber.parse("Your Zong number is 03156230514"))
        assertEquals("03451234567", SimNumber.parse("Dear Customer, your number is 923451234567. Thank you"))
        assertEquals("03451234567", SimNumber.parse("MSISDN: +92 345-1234567"))
        assertEquals("03001234567", SimNumber.parse("3001234567"))
    }

    @Test fun ignores_text_without_a_mobile_number() {
        assertNull(SimNumber.parse("Your request has been received. You will get an SMS shortly."))
        assertNull(SimNumber.parse("8888"))
        assertNull(SimNumber.parse("Balance Rs. 45.20 valid till 30-11-2026"))
    }

    @Test fun network_short_code_is_not_mistaken_for_a_person() {
        // The SMS listener skips senders that parse as a mobile number.
        assertNull(SimNumber.parse("8888"))
        assertNull(SimNumber.parse("Telenor"))
        assertEquals("03451234567", SimNumber.parse("+923451234567"))
    }
}
