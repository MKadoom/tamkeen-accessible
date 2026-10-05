import "lite-youtube-embed";
import BasePage from "./base-page";
import Lightbox from "fslightbox";
window.fslightbox = Lightbox;

const NEAR_VIEWPORT = '400px 0px';

/** Escape text before it is placed inside an HTML string. */
const esc = (value = '') => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Runs `callback` once when `element` gets close to the viewport. */
function whenNear(element, callback) {
    if (!('IntersectionObserver' in window)) {
        return callback();
    }
    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            observer.disconnect();
            callback();
        }
    }, {rootMargin: NEAR_VIEWPORT});
    observer.observe(element);
}

/**
 * A product rail: fetches products for a Salla source page-by-page and renders them with the
 * theme's own <custom-salla-product-card> (which carries the WhatsApp CTA).
 * There is no total cap: «تحميل المزيد» follows the API cursor until it runs out.
 */
class ProductRail {
    constructor(track, {source, sourceValue, limit, onEmpty}) {
        this.track = track;
        this.source = source;
        this.sourceValue = sourceValue;
        this.limit = limit;
        this.onEmpty = onEmpty;
        this.next = null;
        this.moreBtn = null;
    }

    async load() {
        try {
            const response = await salla.api.withoutNotifier(() => salla.product.api.fetch({
                source: this.source,
                source_value: this.sourceValue,
                limit: this.limit,
            }));
            this.track.innerHTML = '';
            const products = response?.data || [];
            if (!products.length) {
                return this.onEmpty?.();
            }
            this.append(products);
            this.setNext(response);
        } catch (error) {
            salla.logger?.warn('Tamkeen::rail failed', error);
            this.onEmpty?.();
        }
    }

    append(products) {
        const fragment = document.createDocumentFragment();
        products.forEach(product => {
            const card = document.createElement('custom-salla-product-card');
            card.product = product;
            fragment.append(card);
        });
        this.track.append(fragment);
    }

    setNext(response) {
        this.next = response?.cursor?.next || null;
        if (!this.next) {
            this.moreBtn?.remove();
            this.moreBtn = null;
            return;
        }
        if (!this.moreBtn) {
            this.moreBtn = document.createElement('button');
            this.moreBtn.type = 'button';
            this.moreBtn.className = 'tk-btn tk-btn--outline tk-rail-more';
            this.moreBtn.textContent = 'تحميل المزيد';
            this.moreBtn.addEventListener('click', () => this.loadMore());
            this.track.after(this.moreBtn);
        }
    }

    async loadMore() {
        if (!this.next || this.moreBtn?.disabled) {
            return;
        }
        this.moreBtn.disabled = true;
        this.moreBtn.setAttribute('aria-busy', 'true');
        try {
            const response = await salla.api.withoutNotifier(() => salla.api.request(this.next));
            this.append(response?.data || []);
            this.setNext(response);
        } catch (error) {
            salla.logger?.warn('Tamkeen::load more failed', error);
        } finally {
            if (this.moreBtn) {
                this.moreBtn.disabled = false;
                this.moreBtn.removeAttribute('aria-busy');
            }
        }
    }
}

class Home extends BasePage {
    onReady() {
        this.initFeaturedTabs();
        this.initCatalog();
        this.initStaticRails();
    }

    /** Rails declared in Twig with data-tk-rail (e.g. featured products). */
    initStaticRails() {
        document.querySelectorAll('[data-tk-rail]').forEach(section => {
            const track = section.querySelector('[data-tk-rail-track]');
            let sourceValue = section.dataset.sourceValue || null;
            try {
                sourceValue = sourceValue ? JSON.parse(sourceValue) : null;
            } catch (e) {
                sourceValue = null;
            }
            whenNear(section, () => new ProductRail(track, {
                source: section.dataset.source,
                sourceValue,
                limit: Number(section.dataset.limit) || 8,
                onEmpty: () => section.remove(),
            }).load());
        });
    }

    /** All categories grid + one product rail per category, loaded progressively. */
    async initCatalog() {
        const grid = document.querySelector('[data-tk-cat-grid]');
        const catalog = document.querySelector('[data-tk-catalog]');
        if (!grid && !catalog) {
            return;
        }

        let categories = [];
        try {
            const response = await salla.api.withoutNotifier(() => salla.product.api.categories());
            categories = (Array.isArray(response?.data) ? response.data : [])
                .filter(category => category && category.url && category.name);
        } catch (error) {
            salla.logger?.warn('Tamkeen::categories failed', error);
        }

        if (!categories.length) {
            grid?.closest('section')?.remove();
            catalog?.remove();
            return;
        }

        grid && this.renderCategoryGrid(grid, categories);
        catalog && this.initCategoryRails(catalog, categories);
    }

    categoryId(category) {
        const id = Number(category.id);
        return Number.isFinite(id) && id > 0 ? id : Number(category.id_);
    }

    categoryImage(category) {
        const image = category.image || category.icon_image || category.avatar;
        return typeof image === 'string' ? image : image?.url;
    }

    renderCategoryGrid(grid, categories) {
        grid.innerHTML = categories.map(category => {
            const image = this.categoryImage(category);
            const subCount = category.sub_categories?.length || 0;
            return `
                <a class="tk-cat-card" href="${esc(category.url)}">
                    <span class="tk-cat-card__media" aria-hidden="true">
                        ${image
                            ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async">`
                            : `<span class="tk-cat-card__initial">${esc(category.name.trim().charAt(0))}</span>`}
                    </span>
                    <span class="tk-cat-card__name">${esc(category.name)}</span>
                    ${subCount ? `<span class="tk-cat-card__meta">${salla.helpers.number(subCount)} أقسام فرعية</span>` : ''}
                    <i class="sicon-keyboard_arrow_left tk-cat-card__arrow" aria-hidden="true"></i>
                </a>`;
        }).join('');
        grid.setAttribute('aria-busy', 'false');
    }

    initCategoryRails(catalog, categories) {
        const rails = catalog.querySelector('[data-tk-cat-rails]');
        const moreBtn = catalog.querySelector('[data-tk-more-categories]');
        const sentinel = catalog.querySelector('[data-tk-sentinel]');
        const perCategory = Number(catalog.dataset.perCategory) || 8;
        const batch = Number(catalog.dataset.batch) || 3;
        const queue = [...categories];

        let observer = null;

        // Re-observing makes the observer report the sentinel's current state again. Needed because
        // removing empty categories can leave the sentinel on screen without a new intersection change.
        const recheck = () => {
            if (observer && queue.length) {
                observer.unobserve(sentinel);
                observer.observe(sentinel);
            }
        };

        const renderBatch = () => {
            queue.splice(0, batch).forEach(category => rails.append(this.createCategoryRail(category, perCategory, recheck)));
            moreBtn.hidden = !queue.length;
            if (!queue.length) {
                observer?.disconnect();
                observer = null;
            }
        };

        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting) && queue.length) {
                    renderBatch();
                    recheck();
                }
            }, {rootMargin: NEAR_VIEWPORT});
        }

        moreBtn.addEventListener('click', () => {
            renderBatch();
            recheck();
        });
        renderBatch();
        observer?.observe(sentinel);
    }

    createCategoryRail(category, perCategory, onRemoved) {
        const section = document.createElement('section');
        const titleId = `tk-cat-${this.categoryId(category)}`;
        section.className = 'tk-cat-rail';
        section.setAttribute('aria-labelledby', titleId);
        section.innerHTML = `
            <header class="tk-cat-rail__head">
                <h3 id="${esc(titleId)}" class="tk-cat-rail__title">
                    <a href="${esc(category.url)}">${esc(category.name)}</a>
                </h3>
                <a class="tk-link-all" href="${esc(category.url)}" aria-label="عرض كل منتجات ${esc(category.name)}">
                    عرض الكل <i class="sicon-keyboard_arrow_left" aria-hidden="true"></i>
                </a>
            </header>
            <div class="tk-rail" data-tk-rail-track>
                ${'<div class="tk-card-skeleton tk-skeleton" aria-hidden="true"></div>'.repeat(4)}
            </div>`;

        whenNear(section, () => new ProductRail(section.querySelector('[data-tk-rail-track]'), {
            source: 'categories',
            sourceValue: [this.categoryId(category)],
            limit: perCategory,
            onEmpty: () => { // categories without products are not shown
                section.remove();
                onRemoved?.();
            },
        }).load());

        return section;
    }

    /**
     * used in views/components/home/featured-products-style*.twig
     */
    initFeaturedTabs() {
        app.all('.tab-trigger', el => {
            el.addEventListener('click', ({ currentTarget: btn }) => {
                let id = btn.dataset.componentId;
                app.toggleClassIf(`#${id} .tabs-wrapper>div`, 'is-active opacity-0 translate-y-3', 'inactive', tab => tab.id == btn.dataset.target)
                    .toggleClassIf(`#${id} .tab-trigger`, 'is-active', 'inactive', tabBtn => tabBtn == btn);

                // fadeIn active tabe
                setTimeout(() => app.toggleClassIf(`#${id} .tabs-wrapper>div`, 'opacity-100 translate-y-0', 'opacity-0 translate-y-3', tab => tab.id == btn.dataset.target), 100);
            })
        });
        document.querySelectorAll('.s-block-tabs').forEach(block => block.classList.add('tabs-initialized'));
    }
}

Home.initiateWhenReady(['index']);
