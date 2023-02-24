# Moon Dunk (Simple)
A dunk bucket controller for a charity stream.

This is a small script used to successively add water to a dunk bucket based on an amount of money donated.  It hooks in to a streamlabs donation api, converts the currency to usd, and dispenses an appropriate amount of water to the bucket.  I wrote a [blog post](https://oneirocosm.com/articles/moondunk-2022/) if you want to see more of the process behind building it.  If you would like to see it in action, you can see a vod of the event [here](https://www.youtube.com/watch?v=sPUi5S27K94)!

## Instructions
In order to use this, there are a few things you need:

### Raspberry Pi
   1. Build a simple circuit as described [here](https://www.youtube.com/watch?v=BVMeVGET_Ak) (full disclosure: this isn't my video).  Note that it is worthwhile to add a container to keep your wiring dry.
   2. Connect the relay to your Raspberry Pi and note what pin you connected it to.
   3. install python if it isn't already installed
   4. `pip install onoff` if it isn't already installed
   5. npm install (note: if you can't install onoff, you can remove it from package.json and run this in debug mode (see below).  That being said, water will not actually flow in debug mode)
   6. setup .env file.  Note that you want MOONDUNK_DEBUG to be set to `false` for actual water to flow.  Also, ensure that MOONDUNK_PIN is set to the pin number you used in step 2
   7. Run using `npm run dunk`

### Other Devices
While other devices don't have access to Python's onoff, they can still be set up for debugging.
   1. npm install (note: if you can't install onoff, you can remove it from package.json and run this in debug mode (see below).  That being said, water will not actually flow in debug mode)
   2. setup .env file.  Note that you want MOONDUNK_DEBUG to be set to `true` for actual water to flow
   3. Run using `npm run dunk`

## Environment Variables
Create a .env file with the following variables:
   - MOONDUNK_JWT    (jwt associated with streamelements account)
   - MOONDUNK_DEBUG  (set true if you are using something other than a raspbery pi for testing purposes)
   - MOONDUNK_PIN    (set to the number associated with the pin the relay is attached to)
   - MOONDUNK_RATE   (estimated water rate **in gallons per second**)
   - MOONDUNK_VOLUME (estimated water volume **in gallons** at which the bucket will dunk)
   - MOONDUNK_GOAL   (estimated goal **in USD** at which the bucket will dunk)

## Features
- automatically accounts for different currencies
- has a terminal printout describing who donated and what the Pi is doing now
- has a countdown timer in the terminal so you know how long the dunk will take
- allows StreamLabs test donations to be used (to save you money during testing)
- creates a persistent queue to store donations in the case of the program crashing.  This should allow things to continue as normal once it is back up and running
- 5 seconds are added inbetween each donation so it becomes clear which donation pushed the bucket over.
