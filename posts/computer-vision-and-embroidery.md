---
title: "Computer Vision and Embroidery"
date: "2021-04-04"
tags: ["python"]
description: "Picking the correct thread colors from embroidery hoop images."
---

Over the weekend, I wrote a program that tries to identify which DMC threads are used in embroidery hoop images. I didn't take a computer vision course at university — nor had I used OpenCV before — so it was fun to learn a few things and I hope you learn from my learnings.

It all started when my wife wanted to find out what colors were used in a few of the hoops posted to r/embroidery. Thus, I embarked on an over-engineered solution: a Python CLI that guesses and then overlays the DMC thread color palette on a given image.

![An embroidery hoop with a color palette overlain — the colors have DMC ids](example_out.jpg)

To get started, I reviewed 100 hoops recently posted to r/embroidery and saw that they were photographed straight on with the hoop near the center. Having a fairly uniform structure, I figured that a little computer vision script could help me out. The hoops being near-perfect circles made them a great target for OpenCV's [Hough Circle Transform](https://docs.opencv.org/master/da/d53/tutorial_py_houghcircles.html). However, the photographs were very noisy. Lots of things appeared like circles and the function took a long time due to the high resolution.

So to better target the hoop area, I used a series of destructive filters — the image is scaled down, converted to gray and then the following are applied: `GaussianBlur`, `medianBlur`, `adaptiveThreshold`, `erode`, `dilate`. As we see below, this makes the hoop more identifiable to `HoughCircles`.

![An image with each additional destructive filter applied](example_destructive_filters.jpg)

I tuned the values for these filters after running the program on the 100 r/embroidery posts I had. The full source code for the program I built can be found at [healeycodes/embroidery-vision](https://github.com/healeycodes/embroidery-vision).

```python
def apply_destructive_filters(image):
    """
    Apply a series of destructive filters with the aim of making circles more
    visible to the HoughCircles function.
    """
    kernel = np.ones((5, 5), np.uint8)

    filtered_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    filtered_image = cv2.GaussianBlur(filtered_image, (5, 5), 0)
    filtered_image = cv2.medianBlur(filtered_image, 5)
    filtered_image = cv2.adaptiveThreshold(
        filtered_image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 3.5
    )
    filtered_image = cv2.erode(filtered_image, kernel, iterations=1)
    filtered_image = cv2.dilate(filtered_image, kernel, iterations=1)
    return filtered_image
```

It's common for multiple circles to be found. When this happens, I pick the largest and most central one. This can be seen in the previous image. The valid circle is green. I sometimes found partial circles that matched the hoop criteria (large and central). However, these were background shapes. Users rarely posted zoomed in images of hoops so I discarded circles that went beyond the edge.

The valid circle often included part of the hoop's border. I didn't want to consider the color of the border as a thread so I shrunk the hoop area by 1% to hide it.

## Color Palette 

There are 454 DMC thread colors. They're called things like `Beige Gray Ult Dk`. The goal is to take the RBG color of the photographed threads and find the closest matching DMC color. I don't account for lighting conditions (how would you do this?) which lowers the accuracy of the results. My program finds some threads and guesses wrong for the others. For nearest-color lookups, I used the k-d tree from [scipy.spatial.KDTree](https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.KDTree.html).

```python
def rgb_to_dmc(r, g, b):
    tree = sp.KDTree(rgb_colors)
    _, result = tree.query((r, g, b))
    # return the index of `rgb_colors`
    return result
```

When I tried calling this on every pixel in the hoop area, the palette it built had too many colors. When there was one kind of dark red thread in the image, the palette would have six or seven different DMC reds. I needed to better group colors together so I quantized the image.

```python
# https://stackoverflow.com/a/20715062
def quantize_image(image, div=64):
    """
    Reduces the number of distinct colors used in an image.
    """
    quantized = image // div * div + div // 2
    return quantized
```

Compressing the color space like this means that instead of finding multiple dark reds we just find one (hopefully the right one). Here's an image before and after the above function is applied.

![An example image without any color quantization, the same image with color quantization](example_quantized.jpg)

After improving the color accuracy somewhat, I arrived at my next problem. Speed.

Calling a k-d tree lookup for every pixel in a high resolution image was slow. For the example image I've been using in this post, there are 600k pixels (which mean the same number of lookups) but only 30 different colors. Adding a cache was a no-brainer. Python's built in Least Recently Used (LRU) cache worked great and now our 600k calls are performed in constant time.

```python
@lru_cache
def cached_rgb_to_dmc(r, g, b):
    return rgb_to_dmc(r, g, b)
```

With the colors found, I drew the palette over the image with the DMC identification numbers. The palette is also sent to standard output (a list of e.g. `#647 Beaver Gray Med 15.81%`)

![An example image's overlain palette](example_palette.jpg)

I found using OpenCV's APIs to be quite straight forward due to the amount of documentation and blog posts online. Whenever I had a question, a search brought me a vaguely related answer. Perhaps I underestimated the popularity of the library. The hardest part (as always) was figuring out the right question to ask.

```python
# overlay the color palette on top of the image
_, w, _ = original_image.shape
size = int(w / len(filtered))
y = size
for idx, color in enumerate(filtered):
    b, g, r = (
        dmc_colors[color[0]]["blue"],
        dmc_colors[color[0]]["green"],
        dmc_colors[color[0]]["red"],
    )
    cv2.rectangle(
        original_image, (size * idx, 0), ((size * idx) + size, size), (b, g, r), -1
    )
    cv2.putText(
        original_image,
        dmc_colors[color[0]]["floss"],
        (size * idx, size - 7),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (255 - b, 255 - g, 255 - r),
        1,
    )
```

_Update – two readers emailed in with advice._

- _One suggested converting RGB to a color space that better matches human visual perception, like CIELAB._
- _Another suggested compressing the color space by using K-means clustering (by guessing K as the number of threads)_

## A sparkle of presentation

I try to do most of my work in public on GitHub. This helps people (many more people than I ever expected to help) but I'm most interested in the effect it has on expanding my network of like-minded makers. It's a joy to receive a message, issue, or PR on any of my work.

When I make a repository public I aim to have a comprehensible README and some tests. For this project, the DMC color lookup is unit tested and example images are used for end to end testing. I added a GitHub Action so that it's easy for people to check their PRs are passing (it's also good to get an email when I've broken something by editing a source file on my phone!). This project is less likely to see collaboration as it's a learning project for me and not really a general tool. It's me-ware. Plus, it doesn't really work.

Lately, I've been using Mypy for my open source Python code. It's been catching bugs and enforcing better code patterns. I use a `requirements-dev.txt` file to pin the Mypy version for the CI pipeline. ~~But sadly, I couldn't get the OpenCV type stubs to work so I removed `mypy .` from my usual GitHub Action.~~ I had a Mypy issue where the type stubs for a few libraries weren't available but a reader emailed me how to fix this — by using a `mypy.ini` configuration file.

```ini
[mypy]
[mypy-cv2]
ignore_missing_imports = True
[mypy-scipy]
ignore_missing_imports = True
[mypy-numpy]
ignore_missing_imports = True
```

I've also found that adding repository tags aids discoverability.

![Thread emoji, Identify which DMC threads are used in embroidery hoop images. Topics: opencv hough-transform embroidery colorpalette dmc-color](tags.png)

Finally, I'll finish up with an open source license like MIT. I'd hate for someone to learn something from one of my toy projects but not be able to use it. I always try to present my work as if there are end users for it — a process that makes coming back to my code far easier than if I hadn't.
