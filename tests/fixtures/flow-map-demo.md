# Clinic Booking App

- kind: phone
- about: Book a visit with a doctor and go to the appointment.
- goal: Book a visit with a doctor
- starts: The person opens the app
- ends: Visit booked, then visit done
- stage: #ffffff
- accent: #0f766e

## Sign in
Open the app and reach the home screen.

1. Open app [message]: Sees the welcome. Taps "Continue".
   ? Have an account?: Yes → 3, No → 2
2. Sign up [form]: Sees the account form. Fills it in and taps "Create account". → 3
3. Log in [form]: Sees the sign-in form. Enters a phone number and taps "Send code".
4. Enter code [form]: Sees the code field. Enters the code and taps "Sign in".
   ? Code correct?: Yes → 5, No → 3
   ! Wrong code: Sees that the code is wrong. Taps "Send a new code". → 3
5. Signed in [done]: Sees the home screen.

## Find a doctor
Choose a doctor and hold a free time.

1. Search doctors [list]: Sees a search box. Searches by name, clinic or speciality.
2. Pick a doctor [list]: Sees ratings, distance and languages. Picks a doctor.
3. See free times [list]: Sees the doctor's calendar. Taps a free time.
4. Check availability [message]: Sees the app check the time. Waits for it to finish.
   ? Time still free?: Yes → 5, No → 3
   ! Time just taken: Sees that the time is gone. Taps "Pick another time". → 3
5. Choose time [done]: Sees that the time is held for five minutes.

## Book and pay
Confirm the appointment and pay for the visit.

1. Confirm details [detail]: Sees the patient, reason and clinic address. Confirms the details.
2. Choose payment [list]: Sees card, Apple Pay and insurance. Chooses a method.
3. Pay [form]: Sees the amount and method. Taps "Pay".
4. Check payment [message]: Sees that the payment is processing. Waits for a response.
   ? Payment OK?: Yes → 5, No → 3
   ! Payment failed: Sees the payment failed. Tries again or changes the card. → 3
5. Visit booked [done]: Sees the confirmation and a link to add the visit to the calendar.

## Visit day
From the reminder to after the appointment.

1. Reminder [message]: Sees the appointment reminder. Opens the booking.
2. Check in [detail]: Sees the check-in QR code. Shows it at reception.
3. See the doctor [detail]: Sees the visit details. Attends the appointment.
4. Rate the visit [form]: Sees an optional rating form. Rates the visit or closes the form.
