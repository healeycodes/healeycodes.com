---
title: "When I'm Sad My Computer Sends Me Cats"
date: "2022-02-18"
tags: ["python"]
description: "I wrote a program that sends cats to my phone when I'm sad at the computer."
---

I wrote a program that sends cats to my phone when I'm sad at the computer. I was inspired by a tweet I saw last week. I've lost the link but, to paraphrase, it went something like this:

> I'm okay submitting myself to The Algorithm as long as it knows when I'm sad and forwards cats directly to my face

I figured that you could probably solve this problem locally without leaking any personal data.

<center>

![A notification on my phone of "Marcus", a cat, who "needs my attention".](catalert2.png)

</center>

Our computers are fast enough that we can run machine learning models in a browser in the background, maybe without even noticing. I tried out a few different JavaScript face recognition libraries that came prepackaged with trained models, and evaluated them by the following criteria:

- Is there example code I can easily hack on?
- Does it accurately reporting when I'm frowning, furrowing, or furious?

I went with [vladmandic/human](https://github.com/vladmandic/human) — another strong contender was [justadudewhohacks/face-api.js](https://github.com/justadudewhohacks/face-api.js). Both these libraries provide an API to get the weights of some common emotions.

```python
['sad', 'angry', 'disgust', 'fear', 'neutral', 'happy', 'surprise']
```

I split the emotions into good vs. bad to get a clearer read of my mood. The overall score swings between -1 (very bad) and 1 (very good). I don't want to be spammed with cats every time I itch my nose and trigger a frame of video that's interpreted as negative so I added a three-second trailing average to look for prolonged periods of negative emotion. There's also a timeout of five minutes after sending a cat before it starts checking again.

You can see some of the emotion scores below in the debug console I added.

![Side by side comparison of the debug log when I'm happy vs. when I'm sad.](happysad.png)

I wrote all the frontend code in an `index.html` file for the prototype. The main loop runs at 30-40FPS on a decade-old desktop (it reads emotion accurately at far lower FPS and should probably be capped to save resources).

```javascript
function main() {
    const config = { backend: 'webgl' }
    const human = new Human.Human(config)

    async function detectVideo() {
        // `inputVideo` is a video of a webcam stream
        const result = await human.detect(inputVideo)
        // `result` contains an array of faces along with emotion weights
        handleResult(result)
        requestAnimationFrame(detectVideo)
    }
    detectVideo()
}
```

The web server runs locally and serves this file and the model data. The full source code is on [healeycodes/if-sad-send-cat](https://github.com/healeycodes/if-sad-send-cat).

## Notifications

I used [Pushover](https://pushover.net/) to send notifications to my iPhone. The [API](https://pushover.net/api)/docs and [community libraries](https://support.pushover.net/i44-example-code-and-pushover-libraries) are delightful, and there's a one month free trial (no credit card required, etc). I had heard of programmers using Pushover as part of different home automation projects and was keen to try it out.

Here's how I send a message and an image from `server.py`:

```python
r = requests.post(
    "https://api.pushover.net/1/messages.json",
    data={
        "token": token,
        "user": user,
        "message": f"{cat_name} needs your attention.",
    },
    files={"attachment": (f"{cat_name}", open(cat_picture, "rb"), "image/jpeg")},
)
```

You'd think that I would be most impressed by my computer being able to read the emotions from my face but I actually think Pushover is the coolest part of this project. The phrase "it just works" is over-used but I found Pushover to be the real deal. I'm going to use it to replace Slack/email/text alerts in my future projects.

## The Cats

I glued together two APIs to get the message data. A random name comes from [https://randomuser.me/api/](https://randomuser.me/api/) and a random cat image is downloaded from [https://api.thecatapi.com/v1/images/search](https://api.thecatapi.com/v1/images/search). I actually need to download and resize the images because The Cat API (Cats as a Service) seems committed to providing very high resolution felines (we're talking 5MB+). Which is how I ended up with this cutely-named function:

```python
def shrink_cat(path):
    image = Image.open(path)
    image.thumbnail((400, 400))
    image.save(path)
```

I used Python's `SimpleHTTPRequestHandler` to serve my static files. This is the same server that runs when you serve files with the famous one-liner `python -m http.server`.

My plan was to have no backend running for this, and while that's still an achievable goal, I found it quicker to write the API glue code in Python. When I realised that I needed an API route to handle the "send cat" event I was about to install Flask when I realised I could just .. keep on using this simple server by adding this hack:

```python
class HttpRequestHandler(http.server.SimpleHTTPRequestHandler):

	# future employers, please look away
    # while I override this function
    def translate_path(self, path):
        if path == "/web/cat.json":
            send_cat()

        return super().translate_path(path)
```

## What's Your Plan With The Emotion Tracking?

My original idea was to track my emotions and which programming language I was currently editing. So I might work on that next.

Prepare yourself for a future blog post with one of the following empirical titles:

- I'm more surprised when I'm writing JavaScript instead of TypeScript
- Python Just Makes Me Happy
- YAML Makes Me Feel Fear