import { hooks } from "@bigcommerce/stencil-utils";
import CatalogPage from "./catalog";
import compareProducts from "./global/compare-products";
import FacetedSearch from "./common/faceted-search";
import { createTranslationDictionary } from "../theme/common/utils/translations-utils";

export default class Category extends CatalogPage {
	constructor(context) {
		super(context);
		this.validationDictionary = createTranslationDictionary(context);
	}

	setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
		$element.attr({
			role: roleType,
			"aria-live": ariaLiveStatus,
		});
	}

	makeShopByPriceFilterAccessible() {
		if (!$("[data-shop-by-price]").length) return;

		if ($(".navList-action").hasClass("is-active")) {
			$("a.navList-action.is-active").focus();
		}

		$("a.navList-action").on("click", () =>
			this.setLiveRegionAttributes(
				$("span.price-filter-message"),
				"status",
				"assertive"
			)
		);
	}

	onReady() {
		this.arrangeFocusOnSortBy();

		$('[data-button-type="add-cart"]').on("click", (e) =>
			this.setLiveRegionAttributes(
				$(e.currentTarget).next(),
				"status",
				"polite"
			)
		);

		this.makeShopByPriceFilterAccessible();

		this.onImageHover();

		compareProducts(this.context);

		if ($("#facetedSearch").length > 0) {
			this.initFacetedSearch();
		} else {
			this.onSortBySubmit = this.onSortBySubmit.bind(this);
			hooks.on("sortBy-submitted", this.onSortBySubmit);
		}

		$("a.reset-btn").on("click", () =>
			this.setLiveRegionsAttributes(
				$("span.reset-message"),
				"status",
				"polite"
			)
		);

		$("button.add-all-to-cart-btn").on("click", () => {
			console.log("click");
			let cartItems = {
				lineItems: [
					{
						quantity: 1,
						productId: 112,
					},
				],
			};

			if (this.context.cartId == null) {
				this.createCart(cartItems);
				$("#cartModal>.modal-content").append(
					"<p>Products were added to your cart!</p>"
				);
				$("#cartModal").foundation("reveal", "open");
			} else {
				this.addToCart(this.context.cartId, cartItems);
				$("#cartModal>.modal-content").text(
					"<p>Product was added to cart!</p>"
				);
				$("#cartModal").foundation("reveal", "open");
			}
		});

		if (this.context.cartId) {
			$("button.remove-all-from-cart-btn").on("click", () => {
				this.deleteCart("/api/storefront/carts/", this.context.cartId);

				$("#cartModal>.modal-content").append(
					"<p>Products were removed from your cart!</p>"
				);
				$("#cartModal").foundation("reveal", "open");
			});
		}

		this.ariaNotifyNoProducts();
	}

	createCart(cartItems) {
		return fetch("/api/storefront/carts", {
			method: "POST",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(cartItems),
		})
			.then((response) => response.json())
			.catch((error) => console.error(error));
	}

	addToCart(cartId, cartItems) {
		return fetch(`/api/storefront/carts/${cartId}/items`, {
			method: "POST",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(cartItems),
		})
			.then((response) => response.json())
			.catch((error) => console.error(error));
	}

	deleteCart(url, cartId) {
		return fetch(url + cartId, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
		})
			.then((response) => response.json())
			.catch((error) => console.error(error));
	}

	onImageHover() {
		$("article.card").on("mouseover", () => {
			const productId = $(
				"article.card>figure>figcaption>div>button"
			).data("productId");

			let url =
				"https://api.bigcommerce.com/stores/8dpp7pf21z/v3/catalog/products";

			let options = {
				method: "GET",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
			};

			fetch(url, options)
				.then((res) => res.json())
				.then((json) => console.log(json))
				.catch((err) => console.error("error:" + err));
		});
	}

	ariaNotifyNoProducts() {
		const $noProductsMessage = $("[data-no-products-notification]");
		if ($noProductsMessage.length) {
			$noProductsMessage.focus();
		}
	}

	initFacetedSearch() {
		const {
			price_min_evaluation: onMinPriceError,
			price_max_evaluation: onMaxPriceError,
			price_min_not_entered: minPriceNotEntered,
			price_max_not_entered: maxPriceNotEntered,
			price_invalid_value: onInvalidPrice,
		} = this.validationDictionary;
		const $productListingContainer = $("#product-listing-container");
		const $facetedSearchContainer = $("#faceted-search-container");
		const productsPerPage = this.context.categoryProductsPerPage;
		const requestOptions = {
			config: {
				category: {
					shop_by_price: true,
					products: {
						limit: productsPerPage,
					},
				},
			},
			template: {
				productListing: "category/product-listing",
				sidebar: "category/sidebar",
			},
			showMore: "category/show-more",
		};

		this.facetedSearch = new FacetedSearch(
			requestOptions,
			(content) => {
				$productListingContainer.html(content.productListing);
				$facetedSearchContainer.html(content.sidebar);

				$("body").triggerHandler("compareReset");

				$("html, body").animate(
					{
						scrollTop: 0,
					},
					100
				);
			},
			{
				validationErrorMessages: {
					onMinPriceError,
					onMaxPriceError,
					minPriceNotEntered,
					maxPriceNotEntered,
					onInvalidPrice,
				},
			}
		);
	}
}
