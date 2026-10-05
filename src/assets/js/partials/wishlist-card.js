
import {buildProductWhatsappUrl, LABEL_ORDER, LABEL_INQUIRE} from './whatsapp';

class WishlistCard extends HTMLElement {

    connectedCallback() {

        if (!this.product) {
            return salla.logger.warn('custom-wishlist-card:: product does not exist!');
        }
        salla.onReady(() => this.render())

    }

    price() {
        const value = this.product.is_on_sale ? this.product.sale_price : this.product.price;
        return value > 0 ? salla.money(value) : '';
    }

    canOrder() {
        return this.product.status === 'sale' && !this.product.is_out_of_stock && !!this.price();
    }

    whatsappUrl() {
        return buildProductWhatsappUrl({name: this.product.name, url: this.product.url, price: this.price()});
    }

    render() {
        this.setAttribute('id', `wishlist-product-${this.product.id}`)
        this.classList.add('product-entry', 'product-entry--wishlist')

        this.innerHTML = `
        <div class="flex items-center mb-4 sm:mb-0">
          <a href="${this.product.url}" class="product-entry__image">
            <img class="object-cover w-full h-full" src="${this.product.image.url}" loading="lazy" alt="${this.product.image.alt}" />
          </a>
          <div class="flex-1 rtl:pr-5 ltr:pl-5">
            <h3 class="text-sm text-gray-800 leading-6 mb-1.5 rtl:pl-5 ltr:pr-5 rtl:md:pl-8 ltr:md:pr-8 line-clamp-1">
              <a href="${this.product.url}">${this.product.name}</a>
            </h3>
            <div class="w-full center-between">
              ${this.product.is_on_sale ? `
                <div class="space-x-1 rtl:space-x-reverse">
                  <h4 class="inline-block text-sm font-bold text-red-400">${salla.money(this.product.sale_price)}</h4>
                  <span class="text-sm text-gray-500 line-through">${salla.money(this.product.regular_price)}</span>
                </div>
              ` : `
                <h4 class="text-sm font-bold">${salla.money(this.product.price)}</h4>
              `}
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-4 rtl:space-x-reverse">
          <a class="tk-btn tk-btn--whatsapp tk-btn--sm flex-grow sm:grow-0 md:w-48"
             href="${this.whatsappUrl()}" target="_blank" rel="noopener noreferrer">
            <i class="sicon-whatsapp" aria-hidden="true"></i>
            <span>${this.canOrder() ? LABEL_ORDER : LABEL_INQUIRE}</span>
          </a>
          <salla-button loader-position="center" shape="icon" size="small" color="danger" class="btn--delete" onclick="salla.wishlist.remove(${this.product.id})">
            <i class="sicon-cancel"></i>
          </salla-button>
        </div>
  `

    }
}

customElements.define('custom-wishlist-card', WishlistCard);
