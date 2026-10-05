import 'lite-youtube-embed';
import BasePage from './base-page';
import Fslightbox from 'fslightbox';
window.fslightbox = Fslightbox;
import { zoom } from './partials/image-zoom';
import { buildProductWhatsappUrl, openWhatsapp, LABEL_ORDER, LABEL_INQUIRE } from './partials/whatsapp';

class Product extends BasePage {
    onReady() {
        app.watchElements({
            totalPrice: '.total-price',
            productWeight: '.product-weight',
            beforePrice: '.before-price',
            startingPriceTitle: '.starting-price-title',
            productSku: '.product-sku',
        });

        this.initProductOptionValidations();
        this.initWhatsappOrder();

        if(imageZoom){
            // call the function when the page is ready
            this.initImagesZooming();
            // listen to screen resizing
            window.addEventListener('resize', () => this.initImagesZooming());
        }
    }

    initProductOptionValidations() {
      document.querySelector('.product-form')?.addEventListener('change', function(){
        this.reportValidity() && salla.product.getPrice(new FormData(this));
      });
    }

    /**
     * Tamkeen: builds the WhatsApp message from the live form state —
     * selected options (by their visible names), quantity and the current price.
     */
    initWhatsappOrder() {
      const form = document.querySelector('.product-form');
      const button = document.querySelector('.tk-product-wa');
      const dataEl = document.getElementById('tk-product-data');
      if (!form || !button || !dataEl) {
        return;
      }

      try {
        this.waData = JSON.parse(dataEl.textContent);
      } catch (e) {
        return; // keep the server-rendered fallback link
      }
      this.waButton = button;
      this.waAvailable = true;

      button.addEventListener('click', event => {
        event.preventDefault();
        // Required options must be chosen first; the browser highlights the missing field.
        if (!form.reportValidity()) {
          return;
        }
        openWhatsapp(buildProductWhatsappUrl({
          name: this.waData.name,
          url: this.waData.url,
          price: this.currentPrice(form),
          options: this.selectedOptions(new FormData(form)),
          quantity: new FormData(form).get('quantity'),
          note: this.waAvailable ? '' : 'أرغب بالاستفسار عن توفر هذا المنتج',
        }));
      });
    }

    selectedOptions(formData) {
      return (this.waData.options || []).map(option => {
        const values = [...formData.getAll(`options[${option.id}]`), ...formData.getAll(`options[${option.id}][]`)]
          .filter(value => typeof value === 'string' && value.trim() !== '')
          .map(value => {
            const detail = (option.details || []).find(item => String(item.id) === String(value));
            return detail ? detail.name : value.trim();
          });
        return {name: option.name, value: values.join('، ')};
      }).filter(option => option.value);
    }

    currentPrice(form) {
      if (!this.waData.price || !this.waAvailable) {
        return ''; // price hidden by the store, or the selected variant is unavailable
      }
      const visible = [...form.querySelectorAll('.total-price')].find(el => el.offsetParent !== null);
      const startingVisible = [...form.querySelectorAll('.starting-price-title')].some(el => el.offsetParent !== null);
      if (!visible || startingVisible) {
        return this.waData.price;
      }
      return visible.innerHTML;
    }

    setWhatsappAvailability(available) {
      if (!this.waButton) {
        return;
      }
      this.waAvailable = available;
      const label = available && this.waData.canOrder ? LABEL_ORDER : LABEL_INQUIRE;
      const span = this.waButton.querySelector('span');
      span && (span.textContent = label);
      this.waButton.setAttribute('aria-label', `${label}: ${this.waData.name} (يفتح في نافذة جديدة)`);
    }

    initImagesZooming() {
      // skip if the screen is not desktop or if glass magnifier
      // is already crated for the image before
      const imageZoom = document.querySelector('.image-slider .magnify-wrapper.swiper-slide-active .img-magnifier-glass');
      if (window.innerWidth  < 1024 || imageZoom) return;
      setTimeout(() => {
          // set delay after the resizing is done, start creating the glass
          // to create the glass in the proper position
          const image = document.querySelector('.image-slider .swiper-slide-active img');
          zoom(image?.id, 2);
      }, 250);
  

      document.querySelector('salla-slider.details-slider').addEventListener('slideChange', (e) => {
          // set delay till the active class is ready
          setTimeout(() => {
              const imageZoom = document.querySelector('.image-slider .swiper-slide-active .img-magnifier-glass');
    
              // if the zoom glass is already created skip
              if (window.innerWidth  < 1024 || imageZoom) return;
              const image = document.querySelector('.image-slider .magnify-wrapper.swiper-slide-active img');
              zoom(image?.id, 2);
          }, 250)
      })
    }

    registerEvents() {
      salla.event.on('product::price.updated.failed',()=>{
        this.setWhatsappAvailability(false);
        app.element('.price-wrapper').classList.add('hidden');
        const outOfStock = app.element('.out-of-stock');
        outOfStock.classList.remove('hidden');
        outOfStock.classList.remove('scale-pulse');
        void outOfStock.offsetWidth; // trigger reflow
        outOfStock.classList.add('scale-pulse');
      })
      salla.product.event.onPriceUpdated((res) => {
        this.setWhatsappAvailability(true);

        app.element('.out-of-stock').classList.add('hidden')
        app.element('.price-wrapper').classList.remove('hidden')

        let data = res.data,
            is_on_sale = data.has_sale_price && data.regular_price > data.price;

        app.startingPriceTitle?.classList.add('hidden');

        app.productWeight.forEach((el) => {el.innerHTML = data.weight || ''});
        app.totalPrice.forEach((el) => {el.innerHTML = salla.money(data.price)});
        app.beforePrice.forEach((el) => {el.innerHTML = salla.money(data.regular_price)});
        app.productSku.forEach((el) => {el.innerHTML = data.sku || ''});

        app.toggleClassIf('.price_is_on_sale','showed','hidden', ()=> is_on_sale)
        app.toggleClassIf('.starting-or-normal-price','hidden','showed', ()=> is_on_sale)

        document.querySelectorAll('.total-price, .product-weight').forEach(el => {
          el.classList.remove('scale-pulse');
          void el.offsetWidth; // trigger reflow
          el.classList.add('scale-pulse');
        });
      });

      app.onClick('#btn-show-more', e => app.all('#more-content', div => {
        e.target.classList.add('is-expanded');
        div.style = `max-height:${div.scrollHeight}px`;
      }) || e.target.remove());
    }
}

Product.initiateWhenReady(['product.single']);
