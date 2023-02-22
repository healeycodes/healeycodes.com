---
title: "My Own Python Web Framework"
date: "2023-02-22"
tags: ["python"]
description: "Using Vercel's Build Output API to explore some framework ideas."
---

Over the past few months, I've been building my own software tools from scratch – like a [programming language](https://healeycodes.com/profiling-and-optimizing-an-interpreter), a [text editor](https://healeycodes.com/making-a-text-editor-with-a-game-engine), and [CLI tools](https://healeycodes.com/beating-grep-with-go). At the weekend, I built a proof-of-concept web framework that deploys to Vercel via the [Build Output API](https://vercel.com/blog/build-output-api).

> A file-system-based specification that allows *any* framework to build for Vercel and take advantage of Vercel's infrastructure building blocks like Edge Functions, Edge Middleware, Incremental Static Regeneration (ISR), Image Optimization, and more.

[Jar](https://github.com/healeycodes/jar) is a toy Python web framework, implemented in about 200 lines of code (see [cli.py](https://github.com/healeycodes/jar/blob/main/framework/cli.py)). I built it to explore some ideas around framework APIs, and to explore frameworks from the author-side of things. Please don't actually use it. It's called Jar because it has almost no features and you need to fill it up yourself!

It uses file-system routing and supports:

- Build pages aka [Static Files](https://vercel.com/docs/build-output-api/v3#vercel-primitives/static-files)
- Fresh pages aka [Serverless Functions](https://vercel.com/docs/build-output-api/v3#vercel-primitives/serverless-functions)
- Regenerated pages aka [Prerender Functions](https://vercel.com/docs/build-output-api/v3#vercel-primitives/prerender-functions)

Jar projects are structured like this:

```text
project/
├─ pages/
│  ├─ index.py
├─ public/
│  ├─ favicon.ico
```

## API Ideas

My personal use case for Jar is building small dynamic websites without a frontend framework. A little inspired by Next.js's APIs, like `getServerSideProps` and `getStaticProps`, Jar's API is defined by three function signatures.

- The data function is called at build time for build pages and regenerated pages. When it's called on the server, it receives a request object with method, path, headers, and body.
- The render function receives the data function's return value, and returns a tuple of `body, info` where info can alter the status code and headers of the response.
- The config function defines the type of page (build, fresh, or regenerated).

Here's a regenerated page from the [kitchen sink example](https://github.com/healeycodes/jar/tree/main/examples/kitchensink):

```python
import time

def render(data):
    return f"<h1>Last regenerated at: {data['time']}</h1>", {}

def data(request=None):
    return {
        "time": time.time()
    }

def config():
    return {
        "regenerate": {
            "every": 5
        }
    }
```

Because we're in Python-land, I wanted the API to be flexible. The data and config functions are optional (and they don't have to take any arguments). So the smallest possible Jar page looks like this:

```python
render = lambda: (“Hi! I'm a little page.”, {})
```

## Building the CLI

While prototyping Jar's CLI, the Build Output API's [documentation](https://vercel.com/docs/build-output-api/v3) and [examples](https://github.com/vercel/examples/tree/main/build-output-api) were comprehensive enough that I didn't run into any major issues. With trial and error, it didn't take long before I was testing Jar by building and deploying real projects (which takes about six seconds end-to-end).

Jar needs to render pages at build time *and* on the server, and uses a lot of dynamic imports and metaprogramming to cut down on lines-of-code and complexity.

In order to treat user-written pages as Python modules, they're imported at run time like this:

```python
module_location = "project/pages/index.py"
spec = importlib.util.spec_from_file_location("", module_location)
page = importlib.util.module_from_spec(spec)
spec.loader.exec_module(page)
# `page` can now be called like `page.render()`
```

Which means dynamically imported build pages can be called at build time to generate static files:

```python
# `page` is a dynamically imported module e.g. it exists at `pages/index.py`
with open(os.path.join(build_dir, f".vercel/output/static/{request_path}"), "w") as f:
    res = call_render(page)
    f.write(res['body'])
    build_config['overrides'][request_path] = {
        'contentType': res['headers']['Content-Type']
    }
```

To create fresh and regenerated pages, Jar creates [Serverless Functions](https://vercel.com/docs/build-output-api/v3#vercel-primitives/serverless-functions) that use the `python3.9` [runtime](https://github.com/vercel/vercel/blob/main/DEVELOPING_A_RUNTIME.md#lambdaruntime). The same functions that are used to create build pages (e.g. `call_data`, `call_render`) are written to a handler file so they can run on the server as needed. And when I say *the same functions* I mean that they are literally read from memory.

```python
def create_handler(path, module_location):
    # the following functions are used at build time to generated build pages
    # and are also used on the server to generated fresh/regenerated pages
    # so we bundle them into a handler file
    with open(path, "w") as f:
        # imports
        f.write("import json\nimport inspect\nimport importlib.util\n")
        f.write('\n')
        # request class
        request_source = inspect.getsource(Request)
        f.write(request_source)
        f.write('\n')
        # call_data function
        call_data_source = inspect.getsource(call_data)
        f.write(call_data_source)
        f.write('\n')
        # call_render function
        call_render_source = inspect.getsource(call_render)
        f.write(call_render_source)
        f.write('\n')
        # app function
        app_source = inspect.getsource(app)
        f.write(app_source.replace("__MODULE_LOCATION", module_location))
        f.write('\n')
```

The Build Output API requires external files like packages to be included as part of the function's file system.

> A [Serverless Function](https://vercel.com/docs/concepts/functions/serverless-functions) is represented on the file system as a directory with a `.func` suffix on the name, contained within the `.vercel/output/functions` directory.
> 
> 
> Conceptually, you can think of this `.func` directory as a filesystem mount for a Serverless Function: the files below the `.func` directory are included (recursively) and files above the `.func` directory are not included. Private files may safely be placed within this directory because they will not be directly accessible to end-users. However, they can be referenced by code that will be executed by the Serverless Function.
> 
> A configuration file named `.vc-config.json` must be included within the `.func` directory, which contains information about how Vercel should construct the Serverless Function.

In Jar, all the project files are copied to each function directory to keep things simple (a more mature framework would split *and* bundle to avoid size limits per function). The `.vc-config.json` file is the same for each too:

```json
{"handler": "__handler.app", "runtime": "python3.9", "environment": {}}
```

The only difference between functions is the module (aka the page file) that the handler imports at run time.

A fresh/regenerated page in Jar maps one-to-one with a Serverless/Prerender Function. When a request hits Vercel's Edge Network, it's [eventually routed](https://vercel.com/docs/concepts/functions/serverless-functions) to the handler file, which calls the relevant page's `data` and `render` function, and then replies to the client.

Some further reading on Vercel internals:

- [Behind the scenes of Vercel's infrastructure](https://vercel.com/blog/behind-the-scenes-of-vercels-infrastructure)
- [Runtime Developer Reference](https://github.com/vercel/vercel/blob/main/DEVELOPING_A_RUNTIME.md)
- [Build your own web framework](https://vercel.com/blog/build-your-own-web-framework)
- SvelteKit's [adapter-vercel](https://github.com/sveltejs/kit/tree/master/packages/adapter-vercel)
- Vercel's CLI [vercel/vercel](https://github.com/vercel/vercel)

## Docs

I like to write documentation for my side-projects no matter the size or number of users. It records a snapshot of my thinking, helps me catch any rough edges, and gives me the push I need to complete the final 10% of the project. It also means I can pick everything back up at any time in the future!

I wrote the docs for Jar … with Jar! See the [project files here](https://github.com/healeycodes/jar/tree/main/examples/docs). The docs use the `marko` markdown package and Prism.js for syntax highlighting (all Jar pages are plain Python, no imports or special syntax).

Serverless/Prerender Functions don't know about anything outside of their function directory, so when using a third-party package, it needs to be installed locally at the project's root. There are some mature methods to get this working (like Python virtual environments) but I haven't run into any issues so far by just installing the packages locally with `pip`'s `--target` argument.

An example of this can be seen below, in the script that builds and deploys the [Jar docs website](https://jar-docs.vercel.app/):

```bash
python3 framework/cli.py build examples/docs
# project packages must be installed locally
# so they are bundled correctly when deployed
cd examples/docs && pip3 install -r requirements.txt --target . && cd ../..
cd build && vercel --prebuilt --prod && cd ..
```

The docs cover this issue, as well as more details about the API, and examples of each type of page.

## Tests

There's this funny axiom that goes [everything is a compiler, a database, or a combination of both](https://twitter.com/predraggruevski/status/1470206964043071491). Web frameworks are definitely compilers — and a quick way to test compilers (which should have deterministic output) is snapshot testing.

Jar's [test suite](https://github.com/healeycodes/jar/blob/main/framework/test_cli.py) builds two projects and snapshot tests the files. For true end-to-end testing, it could deploy and then curl them to verify that the behavior-in-production doesn't diverge.

Speaking of *deterministic output*, I actually ran into a bug where tests would sometimes fail in CI. The bug was due to how Python's `json.dumps` orders the keys when serializing the build config. 

Here's the bug that took me thirty minutes to find and fix:

```diff
with open(os.path.join(build_dir, '.vercel/output/config.json'), 'w') as f:
-     json.dump(build_config, f)
+     json.dump(build_config, f, sort_keys=True)
```

After completing [this project](https://github.com/healeycodes/jar), going all the way from idea to production, it feels like I've peeled back a few computing layers. I'm more comfortable with the flow of web framework → compiler → production.

<small>Thanks to [Samuel Eisenhandler](https://samgeo.codes) for providing feedback on an early draft.</small>
