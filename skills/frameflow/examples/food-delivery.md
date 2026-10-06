# Food Delivery App

- kind: phone
- client: Sample client
- about: Order a meal from nearby restaurants and follow it to the door.
- version: 2
- status: approved
- approved: 2026-10-06
- date: 2026-10-06

## Signing in
From opening the app for the first time to the home page.

1. Welcome [message]: Sees what the app does, taps "Get started". → 2
2. Sign in [form]: Types email and password, taps "Sign in". → 3
   ! Wrong password: Sees a red message, taps "Try again". → 2
3. Home [grid]: Sees nearby restaurants. The story ends here.

## Ordering food
From choosing a restaurant to the order confirmed.

1. Home [grid]: Sees nearby restaurants, taps one. → 2
2. Menu [list]: Adds dishes to the basket, taps "Checkout". → 3
3. Basket [list]: Checks the dishes and the total, taps "Pay". → 4
4. Pay [form]: Enters the card, taps "Pay now". → 5
   ! Card refused: Sees "Payment failed", taps "Try again". → 4
   ! No connection: Sees "You are offline", taps "Retry". → 4
5. Confirmed [done]: Sees the order number and the delivery time. → 6
6. Tracking [detail]: Follows the rider on the way to the door.
