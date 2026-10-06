# Bank Onboarding

- kind: phone
- about: A long story, to prove the part 2 page and the row rules.
- version: 1
- date: 2026-10-06

## Opening an account
Every step from the welcome to the first card, with what can go wrong.

1. Welcome [message]: Sees what the bank offers, taps "Open an account". → 2
2. Phone number [form]: Types the phone number, taps "Send code". → 3
   ! Wrong number: Sees "This number is not valid", fixes it. → 2
3. Code [form]: Types the code from the message, taps "Check". → 4
   ! Wrong code: Sees "That code is not right", taps "Send again". → 3
   ! Code expired: Sees "The code expired", taps "Send a new one". → 3
4. Your name [form]: Types the full name as on the ID card. → 5
5. ID card [detail]: Takes a photo of the ID card, front and back. → 6
   ! Blurry photo: Sees "We can't read it", takes it again. → 5
6. Selfie [detail]: Takes a selfie to match the ID card. → 7
7. Address [form]: Types the home address, taps "Next". → 8
8. Account type [list]: Picks a current or a savings account. → 9
9. Terms [message]: Reads the terms, taps "I agree". → 10
10. Checking [message]: Waits while the bank checks the details. → 11
    ! Needs a review: Sees "We'll call you within a day". → end
11. Welcome aboard [done]: Sees the new account number. → 12
12. Your card [detail]: Sees the card is on its way, taps "Track it". → 13
13. Tracking [list]: Follows the card to the door.
