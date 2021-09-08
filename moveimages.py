from os import walk
import os
import shutil

dirs = []
for (_, dirnames, _) in walk("posts"):
    dirs.extend(dirnames)
    break

for dir in dirs:
    for (_, _, filenames) in walk(f"posts/{dir}"):
        for filename in filenames:
            if filename[-3:] == ".md":
                print(filename)
                dest = f"posts/{dir}.md"
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                shutil.copy(f"posts/{dir}/{filename}", dest)
        break
