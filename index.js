/** Loads and extracts emojis */
const loadEmojis = async () => {
  // fetch external content
  const data = await fetch("assets/objects/emojis.zip")
  // create archive
  const archive = new JSZip()
  // load from url
  await archive.loadAsync(data.blob())
  // get emoji font blob
  const blob = await archive.files["emojis.ttf"].async("blob")
  // create font face and load
  const font = new FontFace("NotoColorEmoji", `url(${URL.createObjectURL(blob)})`)
  // add into document fonts
  document.fonts.add(font)
  // load font face
  await font.load()
  // parse and return emojis
  return JSON.parse(await archive.files["emojis.json"].async("string"))
}

new Vue({
  // root element
  el: "#app",
  // app data
  data: {
    // all items
    items: [],
    // search results
    results: []
  },
  // mounted listener
  async mounted() {
    // load all emoji items
    this.items = await loadEmojis()
    // slice initial results
    this.results = this.items.slice(0, 50)
  }
})
