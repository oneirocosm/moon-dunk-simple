# moon-dunk-simple
A simpler version of the moon dunk application that should work with just one script on a raspberry pi.

## Instructions
In order to use this, there are a few things you need:
- npm install (note: if you can't install onoff, you can remove it from package.json and run this in debug mode (see below).  That being said, water will not actually flow in debug mode)
- setup .env file
- install python (only needed for onoff)

## .env
Create an environment variable file with the following variables:
MOONDUNK_JWT    (jwt associated with streamelements account)
MOONDUNK_DEBUG  (set true if you are using something other than a raspberyy pi for testing purposes)
MOONDUNK_PIN    (set to the number associated with the pin the relay is attached to)
MOONDUNK_RATE   (estimated water rate in gallons per second)
MOONDUNK_VOLUME (estimated water volume at which the bucket will dunk)
MOONDUNK_GOAL   (estimated goal in USD at which the bucket will dunk)