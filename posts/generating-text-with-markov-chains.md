---
title: "Generating Text With Markov Chains"
date: "2021-01-31"
tags: ["python"]
description: "Generating random but familiar text by building Markov chains from scratch."
---

I wanted to write a program that I could feed a bunch of novels and then produce similar text to the author's writing.

One method of generating fake but familiar looking text is to use a Markov chain generator. There is a fantastic Python library for doing this called [jsvine/markovify](https://github.com/jsvine/markovify) but I wanted to learn more about how it works under the hood so I implemented the algorithms from scratch!

Before we get to text generation, let's start by generating some fake weather. Skip the following section if you're familiar with Markov chains.

## Fake Weather Generation

I have some historical weather data from my town. The weather here is either sunny or rainy. When it's sunny, there's a good chance that it remains sunny the next day. It rarely rains but when it does it often rains for a few days.


Rather than using a naive probability (e.g. there's an ~83% chance it is sunny vs. rainy on any given day) we'll use a Markov chain to generate more realistic looking data. Our generated data will have streaks of weather which will more closely resemble real life patterns.

To be specific, if it's sunny there's a 10% chance it will be rainy the next day and a 90% chance it will stay sunny. If it's rainy then there's 50% chance it will be sunny the next day and a 50% chance it will stay rainy.

Here's a diagram of this two-state Markov process.

![A Markov chain with the sunny/rainy values as described above.](weather-markov-chain.png)

Instead of using weights to describe probability, let's distribute the states in a list that we randomly pick from. I find that defining Markov chains like this (while far more computationally expensive) is easier to debug.

```python
weather_chain = {
    'sun': ['sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'rain'],
    'rain': ['sun', 'rain']
}
```

We consume this model by picking a random starting state and using the current state to choose randomly from the possible future states. We do this over and over to generate a sequence.

```python
import random

# the initial state is chosen randomly
weather = [random.choice(list(weather_chain.keys()))]

for i in range(10):
    weather.append(random.choice(weather_chain[weather[i]]))
```

In this example output, we can see that rainy days are 'sticky' as we would expect from the model. 

```python
['rain', 'rain', 'rain', 'sun', 'sun', 'sun', 'sun', 'sun', 'rain', 'rain', 'sun']
```

## Fake Text Generation

Instead of having a predefined Markov chain like we saw in the previous section, let's build one from real data. The full source code for this article and the text corpuses can be found at [healeycodes/markov-chain-generator](https://github.com/healeycodes/markov-chain-generator).

The code excerpts assume that we're generating fiction. So the source text must have capital letters at the start of sentences and full stops at the end of sentences. We can use these two markers to generate text chunks that have a beginning and an end.

In our weather example, the state size was one — to decide the next step in the sequence, we only considered one previous day of weather. When it comes to generating language, a state size of one sometimes isn't big enough and the arrangement of words can be too random to be interesting. A state size of two is a good starting point. Going higher than two can produce text that is too similar to the original text corpus.

The following function builds a Markov chain in the same format as our weather example. It takes a source text and a state size and returns a dictionary where the keys are the current state and their values are a list of possible future states. The lists contain duplicates and this is how we handle the probabilities of future states.

```python
def build_model(source, state_size):
    '''
    Given a corpus and a state size, build a Markov chain.
    '''
    source = source.split()
    model = {}
    for i in range(state_size, len(source)):
        current_word = source[i]
        previous_words = ' '.join(source[i-state_size:i])
        if previous_words in model:
            model[previous_words].append(current_word)
        else:
            model[previous_words] = [current_word]

    return model
```

Given a tiny source of `'An apple is very good. An orange is very bad.'` and a state size of `2` it will produce the following Markov chain. Since the source was so small there are only four possible complete sentences.

```json
{
  "An apple":[
    "is"
  ],
  "apple is":[
    "very"
  ],
  "is very":[
    "good.",
    "bad."
  ],
  "very good.":[
    "An"
  ],
  "good. An":[
    "orange"
  ],
  "An orange":[
    "is"
  ],
  "orange is":[
    "very"
  ]
}
```

The following function consumes the Markov chain model and generates some fake text for us. To achieve a minimum length, we keep generating until we hit the minimum length and then keep going until we reach a token that ends with a full stop. To find a correct starting point, we pick a random key (two words) where the first character is a capital letter.

```python
def generate_text(model, state_size, min_length):
    '''
    Consume a Markov chain model (make sure to specify the <state_size> used)
    to generate text that is at least <min_length> size long.
    '''
    def get_new_starter():
        return random.choice([s.split(' ') for s in model.keys() if s[0].isupper()])
    text = get_new_starter()

    i = state_size
    while True:
        key = ' '.join(text[i-state_size:i])
        if key not in model:
            text += get_new_starter()
            i += 1
            continue

        next_word = random.choice(model[key])
        text.append(next_word)
        i += 1
        if i > min_length and text[-1][-1] == '.':
            break
    return ' '.join(text)
```

Here are those four possible complete sentences from our previous Markov chain. These can be combined infinitely by our function.


```python
'An apple is very bad.'
'An orange is very bad.'
'An orange is very good.'
'An apple is very good.'
```

## Some Examples

We can now feed in large amounts of text from an author and generate fake writing! In fact, any corpus that uses sentences will work with our program. For example, here is the result of feeding in a few Wikipedia articles.

> Cricket is more similar to dust devils and landspouts. They form when a homicide rate of 34.2 per 100,000 was reported. This included 15 officer-involved shootings. One shooting led to the latest hour of it; and lately, I know of but love, desperate love, the worst of all the more remote islands. At around the field. One of Wollstonecraft's most popular metaphors draw on military concepts: Disease is an early type of fiction that were quick to resort to violence. One of Wollstonecraft's favorite arguments.

Here's some Edgar Allen Poe.

> Count could recollect, it was never worth the trouble of the stranger. But, as usual, enveloped in frequent rolls, or bandages, of linen; but, in place of conference with the whole matter as a natural result of the river, and, plunging through a single slender gold chain, and throws a tranquil but magical radiance over all. I cannot enter into details just now: but it was found, on Sunday morning, that he was forced to allow, had ever suspected of existing in the heathen is unwonted; and fickle-mindedness has ever thought of this life and of cutting him off with a layer of plaster, thickly gilt and painted.

## Further Resources

The full source code and a few text corpuses on [healeycodes/markov-chain-generator](https://github.com/healeycodes/markov-chain-generator).

The sun/rain example was taken from [Wikipedia](https://en.wikipedia.org/wiki/Examples_of_Markov_chains#A_simple_weather_model). Victor Powell's article, [Markov Chains](https://setosa.io/ev/markov-chains/), was also helpful for my initial understanding and is worth checking out for the interactive graphics alone.

Some of the articles about Markov chains are a little inaccessible to those without a maths background. However, there's a Simple English version of Wikipedia. Many articles have an alternative page which you can find by replacing the `en` in the URL bar with `simple`. For example, the [simple version](https://simple.wikipedia.org/wiki/Markov_chain) of the Markov chain page.

Daniel Shiffman also covered Markov chains in a Coding Challenge on [The Coding Train](https://www.youtube.com/watch?v=eGFJ8vugIWA).
