import {buildProductWhatsappUrl, LABEL_ORDER, LABEL_INQUIRE} from './whatsapp';
class ProductCard extends HTMLElement {
  constructor(){
    super()
  }
  
  connectedCallback(){
    // Parse product data
    this.product = this.product || JSON.parse(this.getAttribute('product')); 

    if (window.app?.status === 'ready') {
      this.onReady();
    } else {
      document.addEventListener('theme::ready', () => this.onReady() )
    }
  }

  onReady(){
      this.fitImageHeight = salla.config.get('store.settings.product.fit_type');
      this.placeholder = salla.url.asset(salla.config.get('theme.settings.placeholder'));
      this.getProps()

	  this.source = salla.config.get("page.slug");
      // If the card is in the landing page, hide the add button and show the quantity
	  if (this.source == "landing-page") {
	  	this.hideAddBtn = true;
	  	this.showQuantity = window.showQuantity;
	  }

      salla.lang.onLoaded(() => {
        // Language
        this.remained = salla.lang.get('pages.products.remained');
        this.donationAmount = salla.lang.get('pages.products.donation_amount');
        this.startingPrice = salla.lang.get('pages.products.starting_price');
        this.outOfStock = salla.lang.get('pages.products.out_of_stock');

        // re-render to update translations
        this.render();
      })
      
      this.render()
  }

  initCircleBar() {
    let qty = this.product.quantity,
      total = this.product.quantity > 100 ? this.product.quantity * 2 : 100,
      roundPercent = (qty / total) * 100,
      bar = this.querySelector('.s-product-card-content-pie-svg-bar'),
      strokeDashOffsetValue = 100 - roundPercent;
    bar.style.strokeDashoffset = strokeDashOffsetValue;
  }

  formatDate(date) {
    let d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  } 

  getProductBadge() {
    if (this.product?.preorder?.label) {
      return `<div class="s-product-card-promotion-title">${this.product.preorder.label}</div>`
    }

    if (this.product.promotion_title) {
      return `<div class="s-product-card-promotion-title">${this.product.promotion_title}</div>`
    }
    if (this.showQuantity && this.product?.quantity) {
      return `<div
        class="s-product-card-quantity">${this.remained} ${salla.helpers.number(this.product?.quantity)}</div>`
    }
    if (this.showQuantity && this.product?.is_out_of_stock) {
      return `<div class="s-product-card-out-badge">${this.outOfStock}</div>`
    }
    return '';
  }

  getPriceFormat(price) {
    if (!price || price == 0) {
      return salla.config.get('store.settings.product.show_price_as_dash')?'-':'';
    }

    return salla.money(price);
  }

  getProductPrice() {
    let price = '';
    if (this.product.is_on_sale) {
      price = `<div class="s-product-card-sale-price">
                <h4>${this.getPriceFormat(this.product.sale_price)}</h4>
                <span>${this.getPriceFormat(this.product?.regular_price)}</span>
              </div>`;
    }
    else if (this.product.starting_price) {
      price = `<div class="s-product-card-starting-price">
                  <p>${this.startingPrice}</p>
                  <h4> ${this.getPriceFormat(this.product?.starting_price)} </h4>
              </div>`
    }
    else{
      price = `<h4 class="s-product-card-price">${this.getPriceFormat(this.product?.price)}</h4>`
    }

    return price;
  }

  /** Visible price text for the WhatsApp message, or '' when the store hides the price. */
  getWhatsappPrice() {
    const raw = this.product.is_on_sale ? this.product.sale_price : (this.product.starting_price || this.product.price);
    const formatted = this.getPriceFormat(raw);
    if (!formatted || formatted === '-') {
      return '';
    }
    return this.product.starting_price && !this.product.is_on_sale ? `${this.startingPrice || 'يبدأ من'} ${formatted}` : formatted;
  }

  /** «اطلب» for products that can be ordered right away, «استفسر» for everything else. */
  canOrderDirectly() {
    return this.product.status === 'sale'
      && !this.product.is_out_of_stock
      && !!this.getWhatsappPrice()
      && !this.hasOptions();
  }

  hasOptions() {
    return !!(this.product.has_options || this.product.options?.length);
  }

  getWhatsappUrl() {
    let note = '';
    if (this.hasOptions()) {
      note = 'أرغب بمعرفة الخيارات المتاحة لهذا المنتج';
    } else if (this.product.is_out_of_stock || this.product.status !== 'sale') {
      note = 'أرغب بالاستفسار عن توفر هذا المنتج';
    }
    return buildProductWhatsappUrl({
      name: this.product.name,
      url: this.product.url,
      price: this.getWhatsappPrice(),
      note,
    });
  }

  getProps(){

    /**
     *  Horizontal card.
     */
    this.horizontal = this.hasAttribute('horizontal');
  
    /**
     *  Support shadow on hover.
     */
    this.shadowOnHover = this.hasAttribute('shadowOnHover');
  
    /**
     *  Hide add to cart button.
     */
    this.hideAddBtn = this.hasAttribute('hideAddBtn');
  
    /**
     *  Full image card.
     */
    this.fullImage = this.hasAttribute('fullImage');
  
    /**
     *  Minimal card.
     */
    this.minimal = this.hasAttribute('minimal');
  
    /**
     *  Special card.
     */
    this.isSpecial = this.hasAttribute('isSpecial');
  
    /**
     *  Show quantity.
     */
    this.showQuantity = this.hasAttribute('showQuantity');
  }

  escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  }

  render(){
    this.classList.add('s-product-card-entry'); 
    this.setAttribute('id', this.product.id);
    !this.horizontal && !this.fullImage && !this.minimal? this.classList.add('s-product-card-vertical') : '';
    this.horizontal && !this.fullImage && !this.minimal? this.classList.add('s-product-card-horizontal') : '';
    this.fitImageHeight && !this.isSpecial && !this.fullImage && !this.minimal? this.classList.add('s-product-card-fit-height') : '';
    this.isSpecial? this.classList.add('s-product-card-special') : '';
    this.fullImage? this.classList.add('s-product-card-full-image') : '';
    this.minimal? this.classList.add('s-product-card-minimal') : '';
    this.product?.donation?  this.classList.add('s-product-card-donation') : '';
    this.shadowOnHover?  this.classList.add('s-product-card-shadow') : '';
    this.product?.is_out_of_stock?  this.classList.add('s-product-card-out-of-stock') : '';
    this.isInWishlist = !salla.config.isGuest() && salla.storage.get('salla::wishlist', []).includes(Number(this.product.id));
    this.effectiveStatus = (this.product.is_out_of_stock && window.notify_when_available_in_card && !['donating', 'financial_support'].includes(this.product?.type))
      ? 'out-and-notify'
      : this.product.status;
      this.innerHTML = `
        <div class="${!this.fullImage ? 's-product-card-image' : 's-product-card-image-full'}">
          <a href="${this.product?.url}" aria-label="${this.escapeHTML(this.product?.image?.alt || this.product.name)}">
           <img 
              class="s-product-card-image-contain"
              src="${this.product?.image?.url || this.product?.thumbnail || this.placeholder || ''}"
              alt="${this.escapeHTML(this.product?.image?.alt || this.product.name)}"
              loading="lazy"
              decoding="async"
            />
            ${!this.fullImage && !this.minimal ? this.getProductBadge() : ''}
          </a>
          ${this.fullImage ? `<a href="${this.product?.url}" aria-label="${this.escapeHTML(this.product.name)}" class="s-product-card-overlay"></a>`:''}
          ${!this.horizontal && !this.fullImage ?
            `<salla-button
              shape="icon"
              fill="outline"
              color="light"
              name="product-name-${this.product.id}"
              aria-label="إضافة إلى المفضلة أو إزالتها"
              class="s-product-card-wishlist-btn animated ${this.isInWishlist ? 's-product-card-wishlist-added pulse-anime' : 'not-added un-favorited'}"
              onclick="salla.wishlist.toggle(${this.product.id})"
              data-id="${this.product.id}">
              <i class="sicon-heart"></i>
            </salla-button>` : ``
          }
        </div>
        <div class="s-product-card-content">
          ${this.isSpecial && this.product?.quantity ?
            `<div class="s-product-card-content-pie">
              <span>
                <b>${salla.helpers.number(this.product?.quantity)}</b>
                ${this.remained}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -1 36 34" class="s-product-card-content-pie-svg">
                <circle cx="16" cy="16" r="15.9155" class="s-product-card-content-pie-svg-base" />
                <circle cx="16" cy="16" r="15.9155" class="s-product-card-content-pie-svg-bar" />
              </svg>
            </div>`
            : ``}

          <div class="s-product-card-content-main ${this.isSpecial ? 's-product-card-content-extra-padding' : ''}">
            <h3 class="s-product-card-content-title">
              <a href="${this.product?.url}">${this.escapeHTML(this.product?.name)}</a>
            </h3>

            ${this.product?.subtitle && !this.minimal ?
              `<p class="s-product-card-content-subtitle opacity-80">${this.product?.subtitle}</p>`
              : ``}
          </div>
          ${this.product?.donation && !this.minimal && !this.fullImage ?
          `<salla-progress-bar donation='${this.escapeHTML(JSON.stringify(this.product?.donation))}'></salla-progress-bar>`
            : ''}
          <div class="s-product-card-content-sub ${this.isSpecial ? 's-product-card-content-extra-padding' : ''}">
            ${this.getProductPrice()}
            ${this.product?.rating?.stars ?
              `<div class="s-product-card-rating">
                <i class="sicon-star2 before:text-orange-300"></i>
                <span>${this.product.rating.stars}</span>
              </div>`
               : ``}
          </div>

          ${this.isSpecial && this.product.discount_ends
            ? `<salla-count-down date="${this.formatDate(this.product.discount_ends)}" end-of-day=${true} boxed=${true}
              labeled=${true} />`
            : ``}


          ${!this.hideAddBtn ?
            `<div class="s-product-card-content-footer gap-2">
              <a class="tk-btn tk-btn--whatsapp tk-btn--block tk-card-wa"
                 href="${this.getWhatsappUrl()}" target="_blank" rel="noopener noreferrer"
                 aria-label="${this.canOrderDirectly() ? LABEL_ORDER : LABEL_INQUIRE}: ${this.escapeHTML(this.product.name)} (يفتح في نافذة جديدة)">
                <i class="sicon-whatsapp" aria-hidden="true"></i>
                <span>${this.canOrderDirectly() ? LABEL_ORDER : LABEL_INQUIRE}</span>
              </a>

              ${this.horizontal || this.fullImage ?
                `<salla-button 
                  shape="icon" 
                  fill="outline" 
                  color="light" 
                  id="card-wishlist-btn-${this.product.id}-horizontal"
                  aria-label="إضافة إلى المفضلة أو إزالتها"
                  class="s-product-card-wishlist-btn animated ${this.isInWishlist ? 's-product-card-wishlist-added pulse-anime' : 'not-added un-favorited'}"
                  onclick="salla.wishlist.toggle(${this.product.id})"
                  data-id="${this.product.id}">
                  <i class="sicon-heart"></i> 
                </salla-button>`
                : ``}
            </div>`
            : ``}
        </div>
      `

      if (this.product?.quantity && this.isSpecial) {
        this.initCircleBar();
      }

      // Optimistic & Per-card wishlist toggle
      this.querySelectorAll('.s-product-card-wishlist-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const willBeAdded = !btn.classList.contains('s-product-card-wishlist-added');
          app.toggleElementClassIf(btn, 's-product-card-wishlist-added', 'not-added', () => willBeAdded);
          app.toggleElementClassIf(btn, 'pulse-anime', 'un-favorited', () => willBeAdded);
        });
      });
    }
}

customElements.define('custom-salla-product-card', ProductCard);
