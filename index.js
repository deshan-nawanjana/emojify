/** Results limit */
const RESULT_LIMIT = 144

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
    // search query
    query: "",
    // search results
    results: [],
    // copied emoji
    copied: null
  },
  // app methods
  methods: {
    // search emojis
    search(event) {
      // return if not enter key for keydown events
      if (event.type === "keydown" && event.code !== "Enter") { return }
      // simplify and trim search query
      const query = this.query.toLowerCase().trim().replaceAll("  ", " ")
      // return with initial items if no query
      if (!query) {
        // focus in input
        document.querySelector(".search input").focus()
        // return results by limit
        return this.results = this.items.slice(0, RESULT_LIMIT)
      }
      // split into query parts
      const queryParts = query.split(" ")
      // results array
      const results = []
      // filter by exact tags
      const exactMatches = this.items.filter(item => (
        // check if any match for query part in tags
        queryParts.some(part => item.tags.includes(part))
      )).map(item => ({
        // map into item and score by matching tags count
        item, score: item.tags.filter(tag => queryParts.includes(tag)).length
      })).sort((a, b) => (
        // sort by score in descending order
        b.score - a.score
      )).map(result => (
        // remap into items
        result.item
      ))
      // return results if enough for limit
      if (exactMatches.length >= RESULT_LIMIT) {
        return this.results = exactMatches.slice(0, RESULT_LIMIT)
      }
      // filter remaining items
      const remaining = this.items.filter(item => !exactMatches.includes(item))
      // filter by partial matches
      const partialMatches = remaining.filter(item => (
        // check if any match for query part with part of tags
        queryParts.some(part => item.tags.some(tag => tag.includes(part)))
        ||
        // check if any match for tag with part of query
        item.tags.some(tag => queryParts.some(part => part.includes(tag)))
      )).map(item => ({
        // map into item and score by matching tags count
        item, score: queryParts.reduce((score, part) => (
          // cumulate score by part length in tags
          item.tags.some(tag => tag.includes(part)) ? score + part.length : score
        ), 0)
      })).sort((a, b) => (
        // sort by score in descending order
        b.score - a.score
      )).map(result => (
        // remap into items
        result.item
      ))
      // return results by limit
      this.results = [...exactMatches, ...partialMatches].slice(0, RESULT_LIMIT)
    },
    // copy emoji to clipboard
    copy(item) {
      // set as copied item
      this.copied = item.char
      // clear any previous timeout
      clearTimeout(this.timeout)
      // clear copied status
      this.timeout = setTimeout(() => this.copied = null, 1200)
      // write into clipboard data
      navigator.clipboard.writeText(item.char)
    }
  },
  // mounted listener
  async mounted() {
    // load all emoji items
    this.items = await loadEmojis()
    // slice initial results
    this.results = this.items.slice(0, RESULT_LIMIT)
  }
})
