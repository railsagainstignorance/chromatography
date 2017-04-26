# chromatography
experimenting with modelling the physics of chromatography in-browser

Inspired by https://twitter.com/tylhobbs/status/855529052052090881, and then stumbling on [cellauto](http://sanojian.github.io/cellauto/), I fancied a crack at trying to model the physics of chromatography more closely, to see if we could achieve, in-browser, something as lovely as the [FT Labs logo](http://labs.ft.com).

The plan

* start with an image, ideally of bright, sharp colours
* in a canvas, so we can access individual pixels
* model
   * pixel colours as a mixture of inks
   * inks as mixture of dyes
   * dyes with differing Rf,
   * flow of dyes in the presence of a flowing solvent (let's call it water) using a cellular automata
* steps
   * convert each source image pixel into a list of amounts of a known set of dyes
   * build a CA where each cell value is the list of dye amounts   
   * run the CA to cause the dyes to flow from cell to cellular
   * regenerate an image from the resultant dye amounts
   * gasp in wonder at the colourful splodges
   * twiddle the 1000s of params and try again
