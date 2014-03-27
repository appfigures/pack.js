# pack.js

Pack.js is a shape packing library for Javascript that uses a numerical packing algorithm. Pack.js isn't optimal (it doesn't produce the most space-eficient results), but due to its numeric nature it's great for creating more organic looking graphics. It's useful for creating interesting-looking visualizations such as word clouds.

![](http://appfigures.github.io/pack.js/images/packjs.png)
[Demo](http://appfigures.github.io/pack.js/example)

# How does it work

We use a simple verlet-based physics simulation under the hood. It uses gravity to cluster objects around a specific point and collision detection to prevent shapes from intersecting.
