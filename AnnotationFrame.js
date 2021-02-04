/* PURPOSE
   Add the information to let PixInsight recognize the script name and installation path
   within the Scripts menu

   LICENSE

   Copyright (C) 2020 Raymond Packbier.

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the
   Free Software Foundation, version 3 of the License.

   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
   FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
   more details.

   You should have received a copy of the GNU General Public License along with
   this program.  If not, see <http://www.gnu.org/licenses/>.

   Version 0.21
 */

#feature-id    Render > Image Annotation Frame

#feature-info  This script creates and applies a frame with customizable annotations to the image.



#include <pjsr/Sizer.jsh>          // needed to instantiate the VerticalSizer and HorizontalSizer objects
#include <pjsr/CheckState.jsh>     // needed to instantiate the CheckBox objects
#include <pjsr/FontFamily.jsh>


// constants to define frame geometry (using global var since PixInSight has problems with global consts
var frameWidthIncPerc = 3;
var frameHeightIncPerc = 20;
var verticalImageOffset = 0.55;


var annotationFrameParameters = {
   imageView: undefined,
   titleText: "Image Title",
   bottomLeftText1: "Line 1",
   bottomLeftText2: "Line 2",
   bottomLeftText3: "Line 3",
   bottomCenterText1: "Line 1",
   bottomCenterText2: "Line 2",
   bottomCenterText3: "Line 3",
   bottomRightText1: "Line 1",
   bottomRightText2: "Line 2",
   bottomRightText3: "Line 3",
   nrOfColumns: 3,
   leftColumn: true,
   centerColumn: true,
   rightColumn: true
}

var allDimensions = {
   //all value 0 variables will be overwritten by calculateAllDimensions
   imageWidth: 0,
   imageHeight: 0,
   innerFrameThickness: 10,
   framedImageWidth: 0,
   framedImageHeight: 0,
   outerFrameWidth: 0,
   outerFrameHeight: 0,
   titleBarHeight: 0,
   bottomBarHeight: 0
}

var titleFont = {
   //will be populated by function calculateFonts
   fontName: "Helvetica",
   fontColor: 0xFFFFFF,
   fontSizeFactor: 0.3,
   fontSize: 0
}

var bottomFont = {
   //will be populated by function calculateFonts
   fontName: "Helvetica",
   fontColor: 0xFFFFFF,
   fontSizeFactor: 0.2,
   fontSize: 0
}

var renderWindow = undefined;


/*
 * calculateAllDimensions
 * calculates all dimensions used to frame and text rendering
 * PARAMETERS:
    * imageView: image id
 * RETURNS:
    * nothing
 */
function calculateAllDimensions(imageView) {

   //dimensions of image
   allDimensions.imageWidth = imageView.image.width;
   allDimensions.imageHeight = imageView.image.height;

   //dimensions of image including inner frame
   allDimensions.framedImageWidth =
      allDimensions.imageWidth + 2 * allDimensions.innerFrameThickness;
   allDimensions.framedImageHeight =
      allDimensions.imageHeight + 2 * allDimensions.innerFrameThickness;

   //dimensions of framed image
   allDimensions.outerFrameWidth = allDimensions.framedImageWidth *
      (1 + frameWidthIncPerc / 100);
   allDimensions.outerFrameHeight = allDimensions.framedImageHeight *
      (1 + frameHeightIncPerc / 100);

   //calculate vertical dimension of title bar
   allDimensions.titleBarHeight = Math.trunc(
     (allDimensions.outerFrameHeight/2 - allDimensions.framedImageHeight/2) -
     (verticalImageOffset - 0.5) * allDimensions.framedImageHeight);

   //calculate vertical dimension of bottom bar
   allDimensions.bottomBarHeight = Math.trunc(
      (allDimensions.outerFrameHeight/2 - allDimensions.framedImageHeight/2) -
      (0.5 - verticalImageOffset) * allDimensions.framedImageHeight);
}

/*
 * calculateFonts
 * calculates font size parameters
 * PARAMETERS:
    * nothing
 * RETURNS:
    * nothing
*/
function calculateFonts() {
   //title font size calculations
   titleFont.fontSize =
      allDimensions.titleBarHeight * titleFont.fontSizeFactor

   //bottom font size calculations
   bottomFont.fontSize =
      allDimensions.bottomBarHeight / 3 * bottomFont.fontSizeFactor
}


/*
 * titleFits
 * returns true if title fits horizontally, otherwise returns false
 * PARAMETERS:
    * titleString: title of the image
 * RETURNS:
    * true if title fits horizontally
    * false if title does not fit horizontally
*/
function titleFits(titleString) {

   if (renderTextDimensions(titleString, titleFont.fontName, titleFont.fontSize).length <
      allDimensions.framedImageWidth) {
         return true;
      }
   else {
      return false;
   }
}

/*
 * textFits
 * returns true if text fits horizontally, otherwise returns false
 * PARAMETERS:
    * titleString: text of the image
    * nrOfColumns: 1, 2 or 3
 * RETURNS:
    * true if text fits horizontally
    * false if text does not fit horizontally
*/
function textFits(text, nrOfColumns) {

   if (renderTextDimensions(text, bottomFont.fontName, bottomFont.fontSize).length <
      (allDimensions.framedImageWidth / nrOfColumns
       - 0.02 * allDimensions.framedImageWidth)) {   //leave some space between columns
         return true;
      }
   else {
      return false;
   }
}


/*
 * createTextRenderWindow
 * creates a temporary image window to render text
 * PARAMETERS:
    * width: width of the window to be created
    * height: height of the window to be created
 * RETURNS:
    * imageWindow with title "temp_render"
*/
function createTextRenderWindow(width, height) {
   var P = new NewImage;
   P.id = "temp_render";
   P.width = width + 100;  // add 100 pixels to be able to measure too long text
   P.height = height;
   P.numberOfChannels = 1;
   P.colorSpace = NewImage.prototype.Grayscale;
   P.sampleFormat = NewImage.prototype.f32;
   P.v0 = 0.00000000;
   P.v1 = 0.00000000;
   P.v2 = 0.00000000;
   P.va = 1.00000000;

   P.executeGlobal();

   //make window invisible
   ImageWindow.windowById("temp_render").visible = false;

   return ImageWindow.windowById("temp_render");
}

/*
 * closeTextRenderWindow
 * force closes a window
 * PARAMETERS:
    * renderWindow: window id
 * RETURNS:
    * nothing
*/
function closeTextRenderWindow(renderWindow) {
   if ((typeof(renderWindow) != "undefined") && !renderWindow.isNull)
      renderWindow.forceClose();   //forceClose to avoid dialog on closure
}

/* renderTextDimensions
 * returns the length and height of a rendered text in pixels
 * PARAMETERS:
    * text: string of the text to be measured
    * fontname: string
    * fontSize: integer
 * RETURNS:
    * {length, height}
*/
function renderTextDimensions(text,fontName,fontSize) {
   var textDimensions = {length:0, height:0}

   // place annotation in render_view
   var P = new Annotation;
   P.annotationText = text;
   P.annotationFont = fontName;
   P.annotationFontSize = fontSize;
   P.annotationFontBold = false;
   P.annotationFontItalic = false;
   P.annotationFontUnderline = false;
   P.annotationFontShadow = false;
   P.annotationColor = 4294967295;
   P.annotationPositionX = 0;
   P.annotationPositionY = 0;
   P.annotationShowLeader = false;
   P.annotationLeaderPositionX = 0;
   P.annotationLeaderPositionY = 0;
   P.annotationOpacity = 255;

   P.executeOn(View.viewById("temp_render"));

   //measure length of rendered text
   var renderImage = View.viewById("temp_render").image;
   var imageWidth = renderImage.width;
   var imageHeight = renderImage.height;
   var x,y;
//   var length = 0;

   for (x=0; x<imageWidth; x++) {
     for (y=0; y<imageHeight; y++) {
        if (renderImage.sample(x,y) > 0 ) {
           if (x > textDimensions.length) textDimensions.length = x;
           if (y > textDimensions.height) textDimensions.height = y;
        }
     }
   }

   //reset render_view to all black using pixelMath
   var Q = new PixelMath;
   Q.expression = "0";
   Q.useSingleExpression = true;
   Q.generateOutput = true;
   Q.createNewImage = false;
   Q.executeOn(View.viewById("temp_render"));

   return textDimensions;
}



 /*
 * addFrame
 * Adds a frame around an image
 * PARAMETERS:
    * image: image identifier
    * centerX: horizontal center point of outer frame expressed in 0(left) to 1(right)
    * centerY: vertical center point of outer frame expressed in 0(top) to 1(bottom)
    * width: target frame width in pixel
    * height: target frame height in pixel
    * color: "white", "black", "silver"
 * RETURNS:
    * nothing
*/
function addFrame(imageView, centerX, centerY, width, height, color) {
   var P = new DynamicCrop;

   P.centerX = centerX;
   P.centerY = centerY;

   // set new width and height as relative values
   P.width = width / imageView.image.width;
   P.height = height / imageView.image.height;

   // set color of frame
   switch(color) {
      case "white":
         P.red = 1;
         P.green = 1;
         P.blue = 1;
         break;
      case "black":
         P.red = 0;
         P.green = 0;
         P.blue = 0;
         break;
      case "silver":
         P.red = 0.5;
         P.green = 0.5;
         P.blue = 0.5;
         break;
   }

   //execute operation on image
   P.executeOn(imageView);
}

/*
 * addFrameStyle
 * Contains settings for varous frame types
 * PARAMETERS:
    * imageView: image identifier
    * style: style of the frame to apply: "default"
 * RETURNS:
    * assigns global variables:
       * titleBarHeight
 */
function addFrameStyle(imageView, style) {

   switch(style) {
      default:
         //default frame style
         //thin white line around image
         addFrame(imageView, 0.5, 0.5,
            allDimensions.framedImageWidth,
            allDimensions.framedImageHeight, "white");

         //black frame offset towards bottom
         addFrame(imageView, 0.5, verticalImageOffset,
            allDimensions.outerFrameWidth,
            allDimensions.outerFrameHeight, "black");
         break;
   }
}

/*
 * writeImageTitle
 * Annotates the image title to the image
 * PARAMETERS:
    * imageView: image id
    * titleString: title
 * RETURNS:
    * nothing
 */
function writeImageTitle(imageView, titleString) {

   //calculate horizontal midpoint of image
   var horizontalMidPoint = imageView.image.width / 2;

   //calculate text dimensions of annotated text
   var textDimensions =
      renderTextDimensions(titleString, titleFont.fontName, titleFont.fontSize);

   //calculate vertical position of text line
   var verticalTextPosition =
      (allDimensions.titleBarHeight - textDimensions.height) / 2;

   //calculate horizontalTextPosition
   var horizontalTextPosition = horizontalMidPoint - textDimensions.length / 2;

   var P = new Annotation;
   P.annotationText = titleString;
   P.annotationFont = titleFont.fontName;
   P.annotationFontSize = titleFont.fontSize;
   P.annotationFontBold = false;
   P.annotationFontItalic = false;
   P.annotationFontUnderline = false;
   P.annotationFontShadow = false;
   P.annotationColor = 4290822336;
   P.annotationPositionX = horizontalTextPosition;
   P.annotationPositionY = verticalTextPosition;
   P.annotationShowLeader = false;
   P.annotationLeaderPositionX = 0;
   P.annotationLeaderPositionY = 0;
   P.annotationOpacity = 255;

   P.executeOn(imageView);
}

/*
 * writeBottomText
 * writes the bottom text box to the image frame
 * PARAMETERS:
    * imageView: image id
    * line: 1,2 or 3
    * columns: 2 or 3 (if columns=2, block can only be "left" or "right")
    * * block: "left", "center" or "right"
    * text: text to be added to the image frame
 */
function writeBottomText(imageView, line, columns, block, text) {
   var horizontalOffset = 0;

   //measure length of rendered text
   var textLength =
      renderTextDimensions(text, bottomFont.fontName, bottomFont.fontSize).length;

   //calculate horizontal offset based on block
   switch(block) {
      case "left":
         horizontalOffset = 0;
         break;

      case "center":
         horizontalOffset = allDimensions.framedImageWidth * 0.5 -
           textLength/2;
         break;

      case "right":
         horizontalOffset = allDimensions.framedImageWidth -
           textLength;
         break;
   }


   //calculate vertical position of text line
   var verticalTextPosition =
      imageView.image.height - allDimensions.bottomBarHeight +
      allDimensions.bottomBarHeight * 0.17 +
      (line-1) * bottomFont.fontSize * 0.6 / bottomFont.fontSizeFactor;

   //calculate horizontalTextPosition
   var horizontalTextPosition =
      ((imageView.image.width - allDimensions.framedImageWidth) / 2)
      + horizontalOffset;

   var P = new Annotation;
   P.annotationText = text;
   P.annotationFont = bottomFont.fontName;
   P.annotationFontSize = bottomFont.fontSize;
   P.annotationFontBold = false;
   P.annotationFontItalic = false;
   P.annotationFontUnderline = false;
   P.annotationFontShadow = false;
   P.annotationColor = 4290822336;
   P.annotationPositionX = horizontalTextPosition;
   P.annotationPositionY = verticalTextPosition;
   P.annotationShowLeader = false;
   P.annotationLeaderPositionX = 0;
   P.annotationLeaderPositionY = 0;
   P.annotationOpacity = 255;

   P.executeOn(imageView);
}


/*
 * Specify Dialog
 * RETURNS
 * nothing
 */
function annotationFrameDialog() {
   this.__base__ = Dialog;
   this.__base__();

   // let the dialog to be resizable by dragging its borders
   this.userResizable = true;

   // set the minimum width of the dialog
   this.scaledMinWidth = 600;

   // Title area
   this.title = new TextBox(this);
   this.title.text = "<b>Annotation Frame Script v0.21</b> by Raymond Packbier<br><br>" +
      "This script adds an annotation frame to the image." +
      "\nYou can check if the text fits by pressing the 'Check Length' button." +
      " If the text turns red, it will not fit in the designated area." +
      "\n\nYou can either select a font face from the drop down list" +
      " or alternatively type any font face installed on your computer." +
      "\n<i>You can find available font faces by typing 'font' in the windows search box</i>";

   this.title.readOnly = true;
   this.title.minHeight = 220;
   this.title.maxHeight = 220;

   // add a view picker
   this.imageLabel= new Label(this);
   this.imageLabel.text = "Target Image:";
   this.imageLabel.minWidth = 300;
   this.imageLabel.maxWidth = 450;


   this.imageViewList = new ViewList(this);
   //do not list temp_render in view list
   this.imageViewList.excludeIdentifiersPattern = "temp_render";
   this.imageViewList.getAll();
   this.imageViewList.minWidth = 300;
   this.imageViewList.maxWidth = 450;
   this.imageViewList.onViewSelected = () => {
      annotationFrameParameters.imageView = this.imageViewList.currentView;
      //calculations need to be done whenever image is changed
      calculateAllDimensions(this.imageViewList.currentView);
      calculateFonts();


      //close renderWindow if it already exists, since dimensions may be wrong
      if ((typeof(renderWindow) != "undefined") && !renderWindow.isNull)
         closeTextRenderWindow(renderWindow);

      //create rendewWindow with new dimensions
      if (!this.imageViewList.currentView.isNull)
         renderWindow = createTextRenderWindow(
            allDimensions.framedImageWidth,
            allDimensions.titleBarHeight);


      //enable or disable all other fields if image is undefined
      if (annotationFrameParameters.imageView == undefined) {
         //disable all controls
         this.imageTitle.enabled = false;
         this.bottomLeftText1.enabled = false;
         this.bottomLeftText2.enabled = false;
         this.bottomLeftText3.enabled = false;
         this.bottomCenterText1.enabled = false;
         this.bottomCenterText2.enabled = false;
         this.bottomCenterText3.enabled = false;
         this.bottomRightText1.enabled = false;
         this.bottomRightText2.enabled = false;
         this.bottomRightText3.enabled = false;
         this.leftColumnCheckbox.enabled = false;
         this.centerColumnCheckbox.enabled = false;
         this.rightColumnCheckbox.enabled = false;
         this.lengthCheckButton.enabled = false;
      }
      // if image view was set to no view in view list
      else if (annotationFrameParameters.imageView.isNull) {
         //disable all controls
         this.imageTitle.enabled = false;
         this.bottomLeftText1.enabled = false;
         this.bottomLeftText2.enabled = false;
         this.bottomLeftText3.enabled = false;
         this.bottomCenterText1.enabled = false;
         this.bottomCenterText2.enabled = false;
         this.bottomCenterText3.enabled = false;
         this.bottomRightText1.enabled = false;
         this.bottomRightText2.enabled = false;
         this.bottomRightText3.enabled = false;
         this.leftColumnCheckbox.enabled = false;
         this.centerColumnCheckbox.enabled = false;
         this.rightColumnCheckbox.enabled = false;
         this.lengthCheckButton.enabled = false;
      }
      else {
         //enable all controls
         this.imageTitle.enabled = true;
         this.bottomLeftText1.enabled = true;
         this.bottomLeftText2.enabled = true;
         this.bottomLeftText3.enabled = true;
         this.bottomCenterText1.enabled = true;
         this.bottomCenterText2.enabled = true;
         this.bottomCenterText3.enabled = true;
         this.bottomRightText1.enabled = true;
         this.bottomRightText2.enabled = true;
         this.bottomRightText3.enabled = true;
         this.leftColumnCheckbox.enabled = true;
         this.centerColumnCheckbox.enabled = true;
         this.rightColumnCheckbox.enabled = true;
         this.lengthCheckButton.enabled = true;
      }
   }

   // add a selector for the title font
   this.titleFontLabel = new Label(this);
   this.titleFontLabel.text = "Title Font:";
   this.titleFontLabel.minWidth = 300;
   this.titleFontLabel.maxWidth = 450;


   this.titleFont_ComboBox = new ComboBox(this);
   this.titleFont_ComboBox.minWidth = 300;
   this.titleFont_ComboBox.maxWidth = 450;
   this.titleFont_ComboBox.addItem( "Helvetica" );
   this.titleFont_ComboBox.addItem( "Times" );
   this.titleFont_ComboBox.addItem( "Courier" );
   this.titleFont_ComboBox.addItem( "SansSerif" );
   this.titleFont_ComboBox.addItem( "Serif" );
   this.titleFont_ComboBox.addItem( "Monospace" );
   this.titleFont_ComboBox.editEnabled = true;
   this.titleFont_ComboBox.editText = titleFont.fontName;
   this.titleFont_ComboBox.toolTip = "Type a font face to draw with, or select a standard font family.";
   this.titleFont_ComboBox.onEditTextUpdated = function() {
      titleFont.fontName = this.editText;
   };
   this.titleFont_ComboBox.onItemSelected = function( index ) {
      titleFont.fontName = this.itemText( index );
   };

   // add a selector for the annotation font
   this.bottomFontLabel = new Label(this);
   this.bottomFontLabel.text = "Annotation Font:";
   this.bottomFontLabel.minWidth = 300;
   this.bottomFontLabel.maxWidth = 450;


   this.bottomFont_ComboBox = new ComboBox(this);
   this.bottomFont_ComboBox.minWidth = 300;
   this.bottomFont_ComboBox.maxWidth = 450;
   this.bottomFont_ComboBox.addItem( "Helvetica" );
   this.bottomFont_ComboBox.addItem( "Times" );
   this.bottomFont_ComboBox.addItem( "Courier" );
   this.bottomFont_ComboBox.addItem( "SansSerif" );
   this.bottomFont_ComboBox.addItem( "Serif" );
   this.bottomFont_ComboBox.addItem( "Monospace" );
   this.bottomFont_ComboBox.editEnabled = true;
   this.bottomFont_ComboBox.editText = bottomFont.fontName;
   this.bottomFont_ComboBox.toolTip = "Type a font face to draw with, or select a standard font family.";
   this.bottomFont_ComboBox.onEditTextUpdated = function() {
      bottomFont.fontName = this.editText;
   };
   this.bottomFont_ComboBox.onItemSelected = function(index) {
      bottomFont.fontName = this.itemText(index);
   };


   // add a image title textbox
   this.imageTitle = new Edit(this);
   this.imageTitle.readOnly = false;
   this.imageTitle.enabled = false;
   this.imageTitle.minHeight = 40;
   this.imageTitle.maxHeight = 40;
   this.imageTitle.minWidth = 600;
   this.imageTitle.maxWidth = 600;
   this.imageTitle.text = annotationFrameParameters.titleText;
   this.imageTitle.onTextUpdated = () => {
         annotationFrameParameters.titleText = this.imageTitle.text;
   }

   // add check length button
   this.lengthCheckButton = new PushButton(this);
   this.lengthCheckButton.text = "Check Length";
   this.lengthCheckButton.width = 40;
   this.lengthCheckButton.enabled = false;
   this.lengthCheckButton.onClick = () => {
      if (titleFits(this.imageTitle.text) == false) {
        this.imageTitle.foregroundColor = 0xFF0000;
      }
      else {
        this.imageTitle.foregroundColor = 0x000000;
      }
      //bottom left
      if (this.leftColumnCheckbox.checked) {
         if (textFits(this.bottomLeftText1.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomLeftText1.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomLeftText1.foregroundColor = 0x000000;
         }

         if (textFits(this.bottomLeftText2.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomLeftText2.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomLeftText2.foregroundColor = 0x000000;
         }

         if (textFits(this.bottomLeftText3.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomLeftText3.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomLeftText3.foregroundColor = 0x000000;
         }
      }
      //bottom center
      if (this.centerColumnCheckbox.checked) {
         if (textFits(this.bottomCenterText1.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomCenterText1.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomCenterText1.foregroundColor = 0x000000;
         }

         if (textFits(this.bottomCenterText2.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomCenterText2.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomCenterText2.foregroundColor = 0x000000;
         }

         if (textFits(this.bottomCenterText3.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomCenterText3.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomCenterText3.foregroundColor = 0x000000;
         }
      }

      //bottom right
      if (this.rightColumnCheckbox.checked) {
         if (textFits(this.bottomRightText1.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomRightText1.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomRightText1.foregroundColor = 0x000000;
         }

         if (textFits(this.bottomRightText2.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomRightText2.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomRightText2.foregroundColor = 0x000000;
         }

         if (textFits(this.bottomRightText3.text,
            annotationFrameParameters.nrOfColumns) == false) {
           this.bottomRightText3.foregroundColor = 0xFF0000;
         }
         else {
           this.bottomRightText3.foregroundColor = 0x000000;
         }
      }
   };

   // add the image view box (mocked up as a black text box)
   this.imageViewBox = new Edit(this);
   this.imageViewBox.readOnly = true;
   this.imageViewBox.minHeight = 300;
   this.imageViewBox.maxHeight = 600;
   this.imageViewBox.minWidth = 1000;
   this.imageViewBox.maxWidth = 1000;
   this.imageViewBox.backgroundColor = 4278190080; //black

   // add the bottom left textbox 1
   this.bottomLeftTextLabel = new Label(this);
   this.bottomLeftTextLabel.text = "Left aligned"

   this.bottomLeftText1 = new Edit(this);
   this.bottomLeftText1.readOnly = false;
   this.bottomLeftText1.enabled = false;
   this.bottomLeftText1.minHeight = 40;
   this.bottomLeftText1.maxHeight = 40;
   this.bottomLeftText1.minWidth = 300;
   this.bottomLeftText1.maxWidth = 450;
   this.bottomLeftText1.text = annotationFrameParameters.bottomLeftText1;
   this.bottomLeftText1.onTextUpdated = () => {
      annotationFrameParameters.bottomLeftText1 = this.bottomLeftText1.text;
   }
   // add the bottom left textbox 2
   this.bottomLeftText2 = new Edit(this);
   this.bottomLeftText2.readOnly = false;
   this.bottomLeftText2.enabled = false;
   this.bottomLeftText2.minHeight = 40;
   this.bottomLeftText2.maxHeight = 40;
   this.bottomLeftText2.minWidth = 300;
   this.bottomLeftText2.maxWidth = 450;
   this.bottomLeftText2.text = annotationFrameParameters.bottomLeftText2;
   this.bottomLeftText2.onTextUpdated = () => {
      annotationFrameParameters.bottomLeftText2 = this.bottomLeftText2.text;
   }
   // add the bottom left textbox 3
   this.bottomLeftText3 = new Edit(this);
   this.bottomLeftText3.readOnly = false;
   this.bottomLeftText3.enabled = false;
   this.bottomLeftText3.minHeight = 40;
   this.bottomLeftText3.maxHeight = 40;
   this.bottomLeftText3.minWidth = 300;
   this.bottomLeftText3.maxWidth = 450;
   this.bottomLeftText3.text = annotationFrameParameters.bottomLeftText3;
   this.bottomLeftText3.onTextUpdated = () => {
      annotationFrameParameters.bottomLeftText3 = this.bottomLeftText3.text;
   }

   // add the bottom center textbox 1
   this.bottomCenterTextLabel = new Label(this);
   this.bottomCenterTextLabel.text = "Centered"


   this.bottomCenterText1 = new Edit(this);
   this.bottomCenterText1.readOnly = false;
   this.bottomCenterText1.enabled = false;
   this.bottomCenterText1.minHeight = 40;
   this.bottomCenterText1.maxHeight = 40;
   this.bottomCenterText1.minWidth = 300;
   this.bottomCenterText1.maxWidth = 450;
   this.bottomCenterText1.text = annotationFrameParameters.bottomCenterText1;
   this.bottomCenterText1.onTextUpdated = () => {
      annotationFrameParameters.bottomCenterText1 = this.bottomCenterText1.text;
   }
   // add the bottom center textbox 2
   this.bottomCenterText2 = new Edit(this);
   this.bottomCenterText2.readOnly = false;
   this.bottomCenterText2.enabled = false;
   this.bottomCenterText2.minHeight = 40;
   this.bottomCenterText2.maxHeight = 40;
   this.bottomCenterText2.minWidth = 300;
   this.bottomCenterText2.maxWidth = 450;
   this.bottomCenterText2.text = annotationFrameParameters.bottomCenterText2;
   this.bottomCenterText2.onTextUpdated = () => {
      annotationFrameParameters.bottomCenterText2 = this.bottomCenterText2.text;
   }
   // add the bottom center textbox 3
   this.bottomCenterText3 = new Edit(this);
   this.bottomCenterText3.readOnly = false;
   this.bottomCenterText3.enabled = false;
   this.bottomCenterText3.minHeight = 40;
   this.bottomCenterText3.maxHeight = 40;
   this.bottomCenterText3.minWidth = 300;
   this.bottomCenterText3.maxWidth = 450;
   this.bottomCenterText3.text = annotationFrameParameters.bottomCenterText3;
   this.bottomCenterText3.onTextUpdated = () => {
      annotationFrameParameters.bottomCenterText3 = this.bottomCenterText3.text;
   }

   // add the bottom right textbox 1
   this.bottomRightTextLabel = new Label(this);
   this.bottomRightTextLabel.text = "Right aligned"

   this.bottomRightText1 = new Edit(this);
   this.bottomRightText1.readOnly = false;
   this.bottomRightText1.enabled = false;
   this.bottomRightText1.minHeight = 40;
   this.bottomRightText1.maxHeight = 40;
   this.bottomRightText1.minWidth = 300;
   this.bottomRightText1.maxWidth = 450;
   this.bottomRightText1.text = annotationFrameParameters.bottomRightText1;
   this.bottomRightText1.onTextUpdated = () => {
      annotationFrameParameters.bottomRightText1 = this.bottomRightText1.text;
   }
   // add the bottom right textbox 2
   this.bottomRightText2 = new Edit(this);
   this.bottomRightText2.readOnly = false;
   this.bottomRightText2.enabled = false;
   this.bottomRightText2.minHeight = 40;
   this.bottomRightText2.maxHeight = 40;
   this.bottomRightText2.minWidth = 300;
   this.bottomRightText2.maxWidth = 450;
   this.bottomRightText2.text = annotationFrameParameters.bottomRightText2;
   this.bottomRightText2.onTextUpdated = () => {
      annotationFrameParameters.bottomRightText2 = this.bottomRightText2.text;
   }
   // add the bottom right textbox 3
   this.bottomRightText3 = new Edit(this);
   this.bottomRightText3.readOnly = false;
   this.bottomRightText3.enabled = false;
   this.bottomRightText3.minHeight = 40;
   this.bottomRightText3.maxHeight = 40;
   this.bottomRightText3.minWidth = 300;
   this.bottomRightText3.maxWidth = 450;
   this.bottomRightText3.text = annotationFrameParameters.bottomRightText3;
   this.bottomRightText3.onTextUpdated = () => {
      annotationFrameParameters.bottomRightText3 = this.bottomRightText3.text;
   }

   // add checkbox "enable left column"
   this.leftColumnCheckbox = new CheckBox(this);
   this.leftColumnCheckbox.text = "Enable column"
   this.leftColumnCheckbox.enabled = false;
   this.leftColumnCheckbox.minWidth = 300;
   this.leftColumnCheckbox.maxWidth = 450;

   if (annotationFrameParameters.leftColumn)
     this.leftColumnCheckbox.checked = true;
   else
     this.leftColumnCheckbox.checked = false;

   this.leftColumnCheckbox.onClick = () => {
      if (this.leftColumnCheckbox.checked == true) {
         annotationFrameParameters.leftColumn = true;
         //enable left text boxes
         this.bottomLeftText1.enabled = true;
         this.bottomLeftText2.enabled = true;
         this.bottomLeftText3.enabled = true;

      }
      else {
         annotationFrameParameters.leftColumn = false;
         //disable left text boxes
         this.bottomLeftText1.enabled = false;
         this.bottomLeftText2.enabled = false;
         this.bottomLeftText3.enabled = false;
      }
      // count nr of columns
      annotationFrameParameters.nrOfColumns = 0;
      if (annotationFrameParameters.leftColumn)
         annotationFrameParameters.nrOfColumns++;
      if (annotationFrameParameters.centerColumn)
         annotationFrameParameters.nrOfColumns++;
      if (annotationFrameParameters.rightColumn)
         annotationFrameParameters.nrOfColumns++;
   }


   // add checkbox "enable center column"
   this.centerColumnCheckbox = new CheckBox(this);
   this.centerColumnCheckbox.text = "Enable column"
   this.centerColumnCheckbox.enabled = false;
   this.centerColumnCheckbox.minWidth = 300;
   this.centerColumnCheckbox.maxWidth = 450;


   if (annotationFrameParameters.centerColumn)
     this.centerColumnCheckbox.checked = true;
   else
     this.centerColumnCheckbox.checked = false;

   this.centerColumnCheckbox.onClick = () => {
      if (this.centerColumnCheckbox.checked == true) {
         annotationFrameParameters.centerColumn = true;
         //enable center text boxes
         this.bottomCenterText1.enabled = true;
         this.bottomCenterText2.enabled = true;
         this.bottomCenterText3.enabled = true;

      }
      else {
         annotationFrameParameters.centerColumn = false;
         //disable center text boxes
         this.bottomCenterText1.enabled = false;
         this.bottomCenterText2.enabled = false;
         this.bottomCenterText3.enabled = false;
      }
      // count nr of columns
      annotationFrameParameters.nrOfColumns = 0;
      if (annotationFrameParameters.leftColumn)
         annotationFrameParameters.nrOfColumns++;
      if (annotationFrameParameters.centerColumn)
         annotationFrameParameters.nrOfColumns++;
      if (annotationFrameParameters.rightColumn)
         annotationFrameParameters.nrOfColumns++;
   }


   // add checkbox "enable right column"
   this.rightColumnCheckbox = new CheckBox(this);
   this.rightColumnCheckbox.text = "Enable column"
   this.rightColumnCheckbox.enabled = false;
   this.rightColumnCheckbox.minWidth = 300;
   this.rightColumnCheckbox.maxWidth = 450;


   if (annotationFrameParameters.rightColumn)
     this.rightColumnCheckbox.checked = true;
   else
     this.rightColumnCheckbox.checked = false;

   this.rightColumnCheckbox.onClick = () => {
      if (this.rightColumnCheckbox.checked == true) {
         annotationFrameParameters.rightColumn = true;
         //enable right text boxes
         this.bottomRightText1.enabled = true;
         this.bottomRightText2.enabled = true;
         this.bottomRightText3.enabled = true;

      }
      else {
         annotationFrameParameters.rightColumn = false;
         //disable right text boxes
         this.bottomRightText1.enabled = false;
         this.bottomRightText2.enabled = false;
         this.bottomRightText3.enabled = false;
      }
      // count nr of columns
      annotationFrameParameters.nrOfColumns = 0;
      if (annotationFrameParameters.leftColumn)
         annotationFrameParameters.nrOfColumns++;
      if (annotationFrameParameters.centerColumn)
         annotationFrameParameters.nrOfColumns++;
      if (annotationFrameParameters.rightColumn)
         annotationFrameParameters.nrOfColumns++;
   }

   // add the cancel button
   this.cancelButton = new PushButton(this);
   this.cancelButton.text = "Cancel";
   this.cancelButton.width = 40;
   this.cancelButton.onClick = () => {
      this.cancel();
   };

   // add the execution button
   this.execButton = new PushButton(this);
   this.execButton.text = "Execute";
   this.execButton.width = 40;
   this.execButton.onClick = () => {
      this.ok();
   };

   //horizontal sizer for top labels
   this.topLabelSizer = new HorizontalSizer;
   this.topLabelSizer.add(this.imageLabel);
   this.topLabelSizer.addStretch();
   this.topLabelSizer.add(this.titleFontLabel);
   this.topLabelSizer.addStretch();
   this.topLabelSizer.add(this.bottomFontLabel);

   //horizontal sizer for top controls
   this.topControlSizer = new HorizontalSizer;
   this.topControlSizer.add(this.imageViewList);
   this.topControlSizer.addStretch();
   this.topControlSizer.add(this.titleFont_ComboBox);
   this.topControlSizer.addStretch();
   this.topControlSizer.add(this.bottomFont_ComboBox);

   // horizontal sizer for image title text box
   this.imageTitleSizer = new HorizontalSizer;
   this.imageTitleSizer.addStretch();
   this.imageTitleSizer.add(this.imageTitle);
   this.imageTitleSizer.spacing = 8;
   this.imageTitleSizer.add(this.lengthCheckButton);
   this.imageTitleSizer.addStretch();

   // horizontal sizer for image mockup
   this.imageViewBoxSizer = new HorizontalSizer;
   this.imageViewBoxSizer.addStretch();
   this.imageViewBoxSizer.add(this.imageViewBox);
   this.imageViewBoxSizer.addStretch();

   //horizontal sizer for bottom textbox labels
   this.textBoxLabelSizer = new HorizontalSizer;
   this.textBoxLabelSizer.add(this.bottomLeftTextLabel);
   this.textBoxLabelSizer.addStretch();
   this.textBoxLabelSizer.add(this.bottomCenterTextLabel);
   this.textBoxLabelSizer.addStretch();
   this.textBoxLabelSizer.add(this.bottomRightTextLabel);

   //horizontal sizer for bottom textboxes
   this.textBoxSizer1 = new HorizontalSizer;
   this.textBoxSizer1.add(this.bottomLeftText1);
   this.textBoxSizer1.addStretch();
   this.textBoxSizer1.add(this.bottomCenterText1);
   this.textBoxSizer1.addStretch();
   this.textBoxSizer1.add(this.bottomRightText1);

   //horizontal sizer for bottom textboxes
   this.textBoxSizer2 = new HorizontalSizer;
   this.textBoxSizer2.add(this.bottomLeftText2);
   this.textBoxSizer2.addStretch();
   this.textBoxSizer2.add(this.bottomCenterText2);
   this.textBoxSizer2.addStretch();
   this.textBoxSizer2.add(this.bottomRightText2);

   //horizontal sizer for bottom textboxes
   this.textBoxSizer3 = new HorizontalSizer;
   this.textBoxSizer3.add(this.bottomLeftText3);
   this.textBoxSizer3.addStretch();
   this.textBoxSizer3.add(this.bottomCenterText3);
   this.textBoxSizer3.addStretch();
   this.textBoxSizer3.add(this.bottomRightText3);

   //horizontal sizer for center column checkbox
   this.columnSizer = new HorizontalSizer;
   this.columnSizer.add(this.leftColumnCheckbox);
   this.columnSizer.addStretch();
   this.columnSizer.add(this.centerColumnCheckbox);
   this.columnSizer.addStretch();
   this.columnSizer.add(this.rightColumnCheckbox);

   //horizontal sizer for execute button
   this.executionSizer = new HorizontalSizer;
   this.executionSizer.addStretch();
   this.executionSizer.add(this.cancelButton);
   this.executionSizer.addSpacing(8);
   this.executionSizer.add(this.execButton);

   // vertical sizer
   this.sizer = new VerticalSizer;
   this.sizer.margin = 8;
   this.sizer.add(this.title);
   this.sizer.addSpacing(8);
   this.sizer.add(this.topLabelSizer);
   this.sizer.addSpacing(8);
   this.sizer.add(this.topControlSizer);
   this.sizer.addSpacing(8);
   this.sizer.add(this.imageTitleSizer);
   this.sizer.addSpacing(8);
   this.sizer.add(this.imageViewBoxSizer);
   this.sizer.addSpacing(8);
   this.sizer.add(this.textBoxLabelSizer);
   this.sizer.addSpacing(8);
   this.sizer.add(this.textBoxSizer1);
   this.sizer.addSpacing(4);
   this.sizer.add(this.textBoxSizer2);
   this.sizer.addSpacing(4);
   this.sizer.add(this.textBoxSizer3);
   this.sizer.addSpacing(8);
   this.sizer.add(this.columnSizer);
   this.sizer.addSpacing(8);
   this.sizer.add(this.executionSizer)
   this.sizer.addStretch();
}

// create a global instance of annotationFrameDialog
annotationFrameDialog.prototype = new Dialog;


function main() {
   var repeat = true;

   Console.writeln("Start Annotation Frame Script");

  // create and show the dialog
   let dialog = new annotationFrameDialog;

   while (repeat) {

      var retVal=dialog.execute();

      if (retVal == 0) {   //X button was pressed
         Console.noteln("Script execution canceled by user request.");
         closeTextRenderWindow(renderWindow);
         return;
      }

      if (annotationFrameParameters.imageView == undefined) {
         // if no image view is set, reply with error
         Console.criticalln("Please specify image window.");
      }
      // if image view was set to no view in view list
      else if (annotationFrameParameters.imageView.isNull) {
         // if no image view is set, reply with error
         Console.criticalln("Please specify image window.");
      }
      else {
         //add frame around image
         addFrameStyle(annotationFrameParameters.imageView, "default");

         //write image title
         writeImageTitle (annotationFrameParameters.imageView,
            annotationFrameParameters.titleText);

         //write bottom text fields
         if (annotationFrameParameters.leftColumn) {
            writeBottomText(annotationFrameParameters.imageView, 1,
               annotationFrameParameters.nrOfColumns, "left",
               annotationFrameParameters.bottomLeftText1);
            writeBottomText(annotationFrameParameters.imageView, 2,
               annotationFrameParameters.nrOfColumns, "left",
               annotationFrameParameters.bottomLeftText2);
            writeBottomText(annotationFrameParameters.imageView, 3,
               annotationFrameParameters.nrOfColumns, "left",
               annotationFrameParameters.bottomLeftText3);
         }

         if (annotationFrameParameters.centerColumn) {
            writeBottomText(annotationFrameParameters.imageView, 1,
               annotationFrameParameters.nrOfColumns, "center",
               annotationFrameParameters.bottomCenterText1);
            writeBottomText(annotationFrameParameters.imageView, 2,
               annotationFrameParameters.nrOfColumns, "center",
               annotationFrameParameters.bottomCenterText2);
            writeBottomText(annotationFrameParameters.imageView, 3,
               annotationFrameParameters.nrOfColumns, "center",
               annotationFrameParameters.bottomCenterText3);
         }

         if (annotationFrameParameters.rightColumn) {
            writeBottomText(annotationFrameParameters.imageView, 1,
               annotationFrameParameters.nrOfColumns, "right",
               annotationFrameParameters.bottomRightText1);
            writeBottomText(annotationFrameParameters.imageView, 2,
               annotationFrameParameters.nrOfColumns, "right",
               annotationFrameParameters.bottomRightText2);
            writeBottomText(annotationFrameParameters.imageView, 3,
               annotationFrameParameters.nrOfColumns, "right",
               annotationFrameParameters.bottomRightText3);
         }

         closeTextRenderWindow(renderWindow);
         repeat = false;
      }
   }
}

main();
