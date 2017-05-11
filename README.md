# chromatography
experimenting with modelling the physics of chromatography in-browser

This might work: https://railsagainstignorance.github.io/chromatography/?size=40

Inspired by https://twitter.com/tylhobbs/status/855529052052090881, and then stumbling on [cellauto](http://sanojian.github.io/cellauto/), I fancied a crack at trying to model the physics of chromatography more closely, to see if we could achieve, in-browser, something as lovely as the [FT Labs logo](http://labs.ft.com).

## The plan - part 4

Do colour good. Finally found a clear description of what this colour thing is all about: http://dba.med.sc.edu/price/irf/Adobe_tg/models/rgbcmy.html, in particular this bit:

> The CMY model used in printing lays down overlapping layers of varying percentages of transparent cyan, magenta, and yellow inks. Light is transmitted through the inks and reflects off the surface below them (called the substrate). The percentages of CMY ink (which are applied as screens of halftone dots), subtract inverse percentages of RGB from the reflected light so that we see a particular color:

![explanatory image for cmy mixing](http://dba.med.sc.edu/price/irf/Adobe_tg/models/images/cmyk_example.JPG)

### steps

* create a CMY spec for each dyes
* tweak the maths to implement the above alg
* render the image every N iterations (is now slowest part of cycle)

## The plan - part 3

Major refactoring done, so each physical process is handled by its own discrete iteration of the CA. Currently, 'absorption', 'surfaceFlow', 'capillaryFlow', 'diffusion', 'evaporation'. Error-checking after each iteration looks for invalid cell values, and overall loss/gain in water or dyes amounts (of which there should be none).

### steps

* start with amounts at 0, and account for added droplets. DONE.
* tidy CA config params into single json obj
   * allow to be configured on web page
      * ditto the recording facility
* create irregular droplets
* randomise the characteristics of the cells, e.g. water capacity, flow params, etc.
* stop when no water remaining in or on paper. DONE.
* fix surfaceFlow - is not working properly

## The plan - part 2

Well, got something interesting happening, but was hampered by physics of colours, and lack of knowledge thereof, inadequacies of my javascripting.

The easy bit, it turned out, was the physics of dyes flowing through wet paper. The cellular automata is flexible enough to handle lots of possibilities.

Having had a think, was perhaps distracted by
* the starting point, "an image, ideally of bright, sharp colours", and spent too much time trying to achieve a realistic mapping from there into the physics of inks/dyes and subtractive colours.
* the idea of chromatography strips, where the water flows from one end to the other via capillary action, picking up the dyes as it goes.

I'm looking to return to re-imagining the labs splodges, which are more about dollops of wet ink dropped onto dry paper.

So, attempt 2 might well start with a blank, white, paper and modeling
* dropping dollops of wet ink on there
* possibly dropping dollops of water

This will involve
* throwing away the pixels-to-ink code
* modeling water in the CA
   * possibly two modes
      * within the paper (capillary action, aka good old chromatography), possibly drying out
      * on top of the paper (aka spillages, ultimately absorbed into the paper)
* modelling blemishes/inconsistencies in the paper
   * lumpy surface, affecting the spillages
   * different absorption characteristics, affecting the capillary action
*  Q:
   * can the water running on top of the paper pick up some of the dye?
   * evaporation?
   * if multiple waterspots combine, do all the dyes mix?
   * how to visualize an 'active' water spot?
   * what if there is too much dye in the paper? i.e. not just the water.
* tackling the thorny issue of translating from ink/dyes subtractive colour to RGBA for display.

### steps

* focus on defining a CA cell class (perhaps using the Revealing Prototype patterns. hoohaa!), to be manipulated within the CA
   * an obj with
      * specific amounts of the various known dyes
        * possibly in amounts in different states, e.g. wet and dry
      * specific amounts of water
        * probably in different states, each carrying different amounts of dye
           * absorbed into the paper,
           * free-flowing on surface
      * awareness of how it flows between neighbours
         * (?) not sure if this would be better here or in the CA
      * max holding capacity for water,
         * e.g. the paper can't absorb more than a certain amount, and will continue to flow on the surface

Thoughts on imminent CA coding:
- some of the current surface water (plus the associated dyes) get absorbed
   - capacity of paper
   - Rf for the dyes? Dyes get concentrated in remaining/reducing surface water?
   - some dyes get absorbed 'deeper' into the paper?
- remaining surface water can flow from/to here, taking into account
   - from high to low amounts
   - a slope
   - surface characteristics
-  water in paper will, flow by capillary action, from high concentration to low
   - taking with it some dyes
- ink will diffuse, in wet paper
- paper will dry out as water evaporates
- colours will change when wet/dry
- if dry, nothing will flow from this cell

...

## The plan - Part 1

### prep

* get canvas working - DONE
* get cellauto working - DONE
* get an animation working - DONE
* feed the initial img into cellauto - er, no, argh
   * looks like cellauto does not accept init values for cells via initializeFromGrid (or any other init fn). The actual call to init a cell value takes no args. So, looks like will have to modify cellauto if continue using that as the CA.
   * actually, looks ok. (x,y) already passed in to call to init (but does not seem to have been used in any of the examples), so can reference the image pixel values in the init call via a closure in createWorldOfExampleSplashes. Whew. - DONE
   * Would probably be nicer to pass this in as a 3rd arg to initializeFromGrid, but that would involve changing the cellauto code.  - ANOTHER TIME
* []: decide on set of dyes, e.g. RGB to start with? - DONE
* {}: define dye characteristics, e.g. Rf, color - DONE
* fn: map each imageData pixel to a list of dye amounts, to be used by init fn(x,y) via closure - DONE
* fn: map list of dye amounts to imageData pixel - DONE
* assume: continuous flow, used in process(neighbors) via closure - DONE
* fn: define process(neighbors) - DONE
   * pushing dye into neighbors
      * in direction of flow (Rf)
      * sideways? against flow? - perhaps specify a diffusion attribute for when there is no flow, e.g. sideways
* construct clean image of primary colours for testing.
* handle display of colors fading to .. white, not black. Tricky.

### outline

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
