import { Directive, AfterViewChecked, ElementRef, HostListener } from '@angular/core';
import { RerenderAnnouncerService } from "app/rerender-announcer.service";
import * as d3 from 'd3';

@Directive({
  selector: '[app-resizeSVG]'
})
export class ResizesvgDirective implements AfterViewChecked {

  width: number;
  height: number;

  constructor(private el: ElementRef, private rerender: RerenderAnnouncerService) {
  }

  ngAfterViewChecked() {
    // call our matchHeight function here later
    this.log('ngAfterViewCheck - ', this.el && this.el.nativeElement && this.el.nativeElement.getBoundingClientRect());
    this.checkHeight();
  }

  log(...x: any[]) {
    console.info('resizeSVG::', ...x);
  }

  checkHeight() {
      // match height logic here
      const el: HTMLElement = this.el && this.el.nativeElement;
      if (!el) return;      

      const rect = el.getBoundingClientRect(),
        height = rect.height, 
        width = rect.width, 
        margin_w = 40,
        margin_h = 100;

      if (height < 300) { this.log(' warning - height too small ', height); return; }
      if (width < 300) { this.log(' warning - width too small ', width); return; }

      if (this.width !== width || this.height !== height) {


        // remove mode
        /*
        const children = el.getElementsByTagName('svg');
        Array.from(children)
          .map((value: SVGSVGElement, index: number, array: SVGSVGElement[]) => value.remove());

        const width_svgel = Math.round(width-margin_w*2),
          height_svgel = Math.round(height-margin_h*2);
      
        d3.select(el)
          .append('svg')
          .attr('width', ""+width_svgel)
          .attr('height', ""+height_svgel)
          .attr('viewbox', `0 0 ${width_svgel} ${height_svgel}`);

        this.width = width;
        this.height = height;
        this.log('announcing rerender ', width-margin_w*2, height-margin_h*2);        
        // setTimeout(() => this.rerender.annouce(this), 1000);
        this.rerender.annouce(this);
        */
        const width_svgel = Math.round(width-margin_w*2),
        height_svgel = Math.round(height-margin_h*2);
    
        d3.select(el).select('svg')
          .attr('width', ""+width_svgel)
          .attr('height', ""+height_svgel)
          .attr('viewbox', `0 0 ${width_svgel} ${height_svgel}`);

        this.width = width;
        this.height = height;
        this.rerender.annouce(this);       
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
      this.checkHeight();
  }
}
