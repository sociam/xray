import { Directive, AfterViewChecked, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[app-resizeSVG]'
})
export class ResizesvgDirective implements AfterViewChecked {

  width: number;
  height: number;

  constructor(private el: ElementRef) {
  }

  ngAfterViewChecked() {
    // call our matchHeight function here later
    this.matchHeight();
  }

  log(...x: any[]) {
    console.log('resizeSVG::', ...x);
  }

  matchHeight() {
      // match height logic here

      const el: HTMLElement = this.el && this.el.nativeElement;
      if (!el) return;      


      const rect = el.getBoundingClientRect(),
        height = rect.height, 
        width = rect.width;

      if (this.width !== width || this.height !== height) {
        this.log('current bounding rect ', el.getBoundingClientRect());      
        
        const children = el.getElementsByTagName('svg');
        Array.from(children).map((value: SVGSVGElement, index: number, array: SVGSVGElement[]) => value.remove());
        // el.appendChild(el.)
        const svg_el = document.createElement('svg');
        this.log('setting width >> ', width);
        svg_el.setAttribute('width', ""+(width-80));
        svg_el.setAttribute('height', ""+(height-80));
        el.appendChild(svg_el);
        this.width = width;
        this.height = height;
      }
      
      // // step 1: find all the child elements with the selected class name
      // const children = parent.getElementsByTagName(className);

      // if (!children) return;

      // // step 2a: get all the child elements heights
      // const itemHeights = Array.from(children)
      //     .map(x => x.getBoundingClientRect().height);

      // // step 2b: find out the tallest
      // const maxHeight = itemHeights.reduce((prev, curr) => {
      //     return curr > prev ? curr : prev;
      // }, 0);

      // // step 3: update all the child elements to the tallest height
      // Array.from(children)
      //     .forEach((x: HTMLElement) => x.style.height = `${maxHeight}px`);
  }

  @HostListener('window:resize') 
  onResize() {
      // call our matchHeight function here
      this.matchHeight();
  }
}
