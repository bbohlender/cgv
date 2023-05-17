# QuickProBuild

![Header](./cgv.png)

_A Web-based Approach for Quick Procedural 3D Reconstructions of Buildings_

# [⤷ Demo](https://cc-bbohlender.github.io/cgv)

# Tutorials

* [Tutorial 1 - Introduction](https://youtu.be/zPJIINTPS94)
* [Tutorial 2 - Copy, Paste, and Adapt](https://youtu.be/r1kTkCn6QgI)

## How to cite

```bibtex
@inproceedings {10.2312:egs.20231001,
booktitle = {Eurographics 2023 - Short Papers},
editor = {Babaei, Vahid and Skouras, Melina},
title = {{Quick-Pro-Build: A Web-based Approach for Quick Procedural 3D Reconstructions of Buildings}},
author = {Bohlender, Bela and Mühlhäuser, Max and Guinea, Alejandro Sanchez},
year = {2023},
publisher = {The Eurographics Association},
ISSN = {1017-4656},
ISBN = {978-3-03868-209-7},
DOI = {10.2312/egs.20231001}
}
```

## Development

1. `npm install` to install the library dependencies
2. `npm run build` to build the cgv library
3. `cd web` to move into the frontend folder
4. `npm run install` to install the frontend dependencies
5. `npm run dev` to start the frontend

`now access http://localhost:3000/cgv to access the respective domain editor`

## Folder Structure

-   `src` contains the source code for the core library including the domains in `src/domains`
-   `web` contains the frontend code in react (the pages for the respective editors)

