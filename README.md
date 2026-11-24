# Resincraftcode — website

A small shop website for handmade resin keychains from Phuket, in English, Thai and Russian.

Built with plain HTML, CSS and JavaScript. Nothing to install.

## The pages

| Page | What it is |
|---|---|
| `index.html` | Home page: hero, alphabet, ready-made designs, three ways to order, styles, how it works, story, reviews, Instagram, FAQ |
| `design.html` | The designer: choose the mold, then the letter, then style, colours and what goes inside (drag items from the list onto the piece, zoom, paint, Big view, Surprise me) |
| `canvas.html` | Canvases: any size, beach style, or a customer photo dragged and zoomed into a cut-out shape |
| `idea.html` | "Send us your idea": customers upload a photo or sketch and send it by DM |

Handy links into the designer:
- `design.html?letter=S` opens it with the letter S
- `design.html?preset=froggy-pond` opens a ready-made design to customise

## What to edit

| File | Edit it to change… |
|---|---|
| `config.js` | Prices (hidden for now: `showPrices: false`), colours, add-ins, ready-made designs, **reviews**, Instagram and Facebook links, idea-page sizes |
| `i18n-site.js` | Words on the home page, menu and idea page (EN / TH / RU) |
| `i18n.js` | Words inside the designer (EN / TH / RU) |
| `style.css` | Colours and fonts (top of the file) |
| `images/` | Your photos |
| `images/og-image.jpg` | The picture shown when someone shares the site link |

You don't need to touch `core.js`, `site.js` or `app.js`.

## Add your reviews

Open `config.js` and find `const REVIEWS = [`. Add one line per review:

```js
const REVIEWS = [
  { name: "Mai", place: "Phuket", text: "So pretty, my friend loved it!" },
  { name: "Ilya", place: "Moscow", text: "Perfect souvenir.", text_ru: "Идеальный сувенир.", photo: "images/review-ilya.jpg" },
];
```

The "From our customers" section appears by itself as soon as the list has a review. Only use real reviews from real customers.

## Add your Facebook, WhatsApp and LINE

In `config.js`, near the top:

```js
  facebook: "https://www.facebook.com/your-page",
  whatsapp: "+66 81 234 5678",   // WhatsApp button appears in the "Send to Anna" popup
  line: "@yourshop",             // LINE button appears too ("@..." for a LINE Official Account)
```

Anything left as `""` stays hidden.

## Show prices

Set `showPrices: true` in `config.js`. To show "from ฿…" on a shop card, add `price:` to that item, for example:

```js
{ img: "images/real/g-domino.jpg", cap: "Domino set", price: 890 },
```

## Delivery and payment

The home page has a "Delivery and payment" block. Fill in `delivery` in `config.js` (with `_th` and `_ru` versions if you like). While it is empty the block uses the general text from the FAQ.

## More photos of one piece

Upload extra angles next to the first photo in `images/real/`, named `-2`, `-3` and so on (`g-tail.jpg`, `g-tail-2.jpg`). After you push, GitHub updates `photos.js` by itself and the card becomes a slider.

## Open it on your Mac

In VS Code, install **Live Server**, right-click `index.html` → **Open with Live Server**.

## Put changes online

GitHub Desktop → type a short message → **Commit to main** → **Push origin**. Your site updates in about a minute at `https://YOUR-USERNAME.github.io/keychain-studio/`.
