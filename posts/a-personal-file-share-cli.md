---
title: "A Personal File Share CLI"
date: "2022-12-27"
tags: ["go"]
description: "Sharing files with my friends from the terminal."
---

I wanted to share a PDF with my friend via Discord but I was stopped by this screen.

![Discord file upload warning: The max size is 8MB](discord-warning.png)

There are a few ways around this problem without paying for a subscription. Like emailing the PDF as an attachment or uploading it to Google Drive with share permissions.

None of the alternatives are perfect. When I need to quickly share a file during an online conversation (on a platform without unrestrictive, native file upload) I waste time.

I estimated that by building [a custom solution](https://github.com/healeycodes/file-share-cli) within a time budget of two hours, I would start *saving time* within one year.

This is where I lose time when I have to share a file.

- Navigating a user interface
- Two-factor logging into services
- Remembering how to configure share permissions on said services
- Having to switch services because uploading .exe files is a red flag or because the file size is too large

All of these can be solved with a web server and a bash script.

I want to type `share <file>` in my terminal and receive a download link. Note: on macOS you can drag a file into the terminal to paste the path.

To save even more time when swapping computers, I made the homepage of the web server return a copy-able shell function so I can quickly configure it on a new machine.

```bash
# if you are me, copy this to your ~/.bashrc
# and use it like this: share somefile.txt
# and a download link will be echoed
# (don't forget to replace user/pass)
function share () {
	curl -u user:pass -F "file=@$1" https://my-url-at.railway.app/upload
}
```

## Building It

The web server is written in Go using just the standard library, and it’s deployed within [Railway](https://railway.app/)’s free tier.

I searched “basic auth in go” and came across a middleware snippet to stop other people uploading files to my server. It also includes logic to stop timing attacks from leaking auth information.

```go
// https://www.alexedwards.net/blog/basic-authentication-in-go
func (app *application) basicAuth(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		if ok {
			usernameHash := sha256.Sum256([]byte(username))
			passwordHash := sha256.Sum256([]byte(password))
			expectedUsernameHash := sha256.Sum256([]byte(app.auth.username))
			expectedPasswordHash := sha256.Sum256([]byte(app.auth.password))

			usernameMatch := (subtle.ConstantTimeCompare(usernameHash[:], expectedUsernameHash[:]) == 1)
			passwordMatch := (subtle.ConstantTimeCompare(passwordHash[:], expectedPasswordHash[:]) == 1)

			if usernameMatch && passwordMatch {
				next.ServeHTTP(w, r)
				return
			}
		}

		w.Header().Set("WWW-Authenticate", `Basic realm="restricted", charset="UTF-8"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	})
}
```

For storage, I’m using the local file system. This project is for sharing files *not* for backing then up so I’m okay losing data whenever I deploy a code change. An alternative would be to stream files to/from an object store like S3 (costing a few pennies at my scale).

Files are uploaded over HTTP via form data. I was able to find another article with a snippet for handling single file upload.

```go
// https://freshman.tech/file-upload-golang/
func (app *application) upload(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

  // The Content-Length header is untrusted, use this instead
	r.Body = http.MaxBytesReader(w, r.Body, MAX_UPLOAD_SIZE)
	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		http.Error(w, fmt.Sprintf("File too large. Must be smaller than %v bytes", MAX_UPLOAD_SIZE), http.StatusBadRequest)
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Create the uploads folder if it doesn't already exist
	err = os.MkdirAll("./uploads", os.ModePerm)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create file
	dst, err := os.Create(fmt.Sprintf("./uploads/%v", fileHeader.Filename))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Write to file
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Reply with a download link
	w.Write([]byte(fmt.Sprintf("%v/dl?f=%v", app.website, fileHeader.Filename)))
}
```

The download endpoint stops directory traversal attacks by cleaning the path of navigation e.g `?f=../some-parent-dir/secrets.txt`.

```go
func (app *application) download(w http.ResponseWriter, r *http.Request) {
	fp := r.URL.Query().Get("f")
	if fp == "" {
		http.Error(w, "Missing query parameter e.g. `?f=examplefile.txt`", http.StatusBadRequest)
	}

	// Make the browser open a download dialog
	w.Header().Set("Content-Disposition", "attachment; filename="+strconv.Quote(fp))
	w.Header().Set("Content-Type", "application/octet-stream")

	// Avoid directory traversal (https://dzx.cz/2021/04/02/go_path_traversal/)
	http.ServeFile(w, r, filepath.Join("uploads", filepath.Join("/", fp)))
}
```

I haven’t implemented any security around downloading. Anyone can download my shared files. Also, because they’re keyed by filename, sensitive files can be easily guessed but I won’t be uploading anything I don’t want public.

If I change my mind about this design in the future, one security improvement I can make is to add a token parameter that’s returned by a new “secure upload” endpoint and required (and checked) when downloading a secure file. [Verifying integrity with a secret using HMAC](http://www.inanzzz.com/index.php/post/g4nt/signing-messages-and-verifying-integrity-with-a-secret-using-hmac-in-golang) would be a good fit without having to pull in extra libraries.

*Start the clock*, I’m now saving time when sharing files with my friends! Unfortunately, I wrote this blog post, and then wrote a [README](https://github.com/healeycodes/file-share-cli), and now won’t be time-positive for [about a decade](https://xkcd.com/1205/).
