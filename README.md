# chromatography
experimenting with modelling the physics of chromatography in-browser

Inspired by https://twitter.com/tylhobbs/status/855529052052090881, and then stumbling on [cellauto](http://sanojian.github.io/cellauto/), I fancied a crack at trying to model the physics of chromatography more closely, to see if we could achieve, in-browser, something as lovely as the [FT Labs logo](http://labs.ft.com).

## The plan

### prep

* get canvas working - DONE
* get cellauto working - DONE
* get an animation working - DONE
* feed the initial img into cellauto - er, no, argh
   * looks like cellauto does not accept init values for cells via initializeFromGrid (or any other init fn). The actual call to init a cell value takes no args. So, looks like will have to modify cellauto if continue using that as the CA.
   * actually, looks ok. (x,y) already passed in to call to init (but does not seem to have been used in any of the examples), so can reference the image pixel values in the init call via a closure in createWorldOfExampleSplashes. Whew. Would probably be nicer to pass this in as a 3rd arg to initializeFromGrid, but that would involve changing the cellauto code.  
* []: decide on set of dyes, e.g. RGB to start with?
* {}: define dye characteristics, e.g. Rf, color
* fn: map each imageData pixel to a list of dye amounts, to be used by init fn(x,y) via closure
* fn: map list of dye amounts to imageData pixel
* assume: continuous flow, used in process(neighbors) via closure
* fn: define process(neighbors)
   * pushing dye into neighbors
      * in direction of flow (Rf)
      * sideways? against flow? - perhaps specify a diffusion attribute for when there is no flow, e.g. sideways

### main steps

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
