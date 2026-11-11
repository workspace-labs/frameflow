# Food Delivery App

- kind: phone
- client: Sample client
- about: Order a meal from nearby restaurants and follow it to the door.
- stage: #f3f4f6
- accent: #f2541b
- version: 2
- status: approved
- approved: 2026-10-06
- date: 2026-10-06

## Signing in
From opening the app for the first time to the home page.

1. Welcome [message]: Sees what the app does. Taps "Get started". → 2
2. Sign in [form]: Sees the email and password fields. Types them, taps "Sign in". → 3
   ! Wrong password: Sees a red message. Taps "Try again". → 2
3. Home [grid]: Sees nearby restaurants.

## Ordering food
From choosing a restaurant to the order confirmed.

1. Home [grid]: Sees nearby restaurants. Taps one. → 2
2. Menu [list]: Sees the dishes and prices. Adds dishes, taps "Checkout". → 3
3. Basket [list]: Sees the dishes and the total. Taps "Pay". → 4
4. Pay [form]: Sees the card form. Enters the card, taps "Pay now". → 5
   ! Card refused: Sees "Payment failed". Taps "Try again". → 4
   ! No connection: Sees "You are offline". Taps "Retry". → 4
5. Confirmed [done]: Sees the order number and the delivery time. Taps "Track". → 6
6. Tracking [detail]: Sees the rider on the way to the door.
