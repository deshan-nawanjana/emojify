/** Base URL */
const BASE_URL = window.baseURL ?? ""

/** Results limit */
const RESULT_LIMIT = 80

/** Ignoring words for enhancement */
const IGNORE_WORDS = []

/** Loads and extracts emojis */
const loadEmojis = async () => {
  // fetch external content
  const data = await fetch(BASE_URL + "assets/objects/data.zip")
  // create archive
  const archive = new JSZip()
  // load from url
  await archive.loadAsync(data.blob())
  // get emoji font blob
  const blob = await archive.files["NotoColorEmoji.ttf"].async("blob")
  // create font face and load
  const font = new FontFace("NotoColorEmoji", `url(${URL.createObjectURL(blob)})`)
  // add into document fonts
  document.fonts.add(font)
  // load font face
  await font.load()
  // parse and return emoji lists
  return {
    original: JSON.parse(await archive.files["EmojiList.json"].async("string")),
    synonyms: JSON.parse(await archive.files["EmojiListSynonyms.json"].async("string")),
  }
}

new Vue({
  // root element
  el: "#app",
  // app data
  data: {
    // ready state
    ready: false,
    // all items
    items: [],
    // search results
    results: [],
    // search input values
    search: { query: "", copied: null },
    // text enhancement values
    enhance: { input: "", output: "", copied: null }
  },
  // app methods
  methods: {
    // search emojis
    searchEmojis(event) {
      // return if not enter key for keydown events
      if (event.type === "keydown" && event.code !== "Enter") { return }
      // simplify and trim search query
      const query = this.search.query.toLowerCase().trim().replaceAll("  ", " ")
      // return with initial items if no query
      if (!query) {
        // focus in input
        document.querySelector(".search input").focus()
        // return results by limit
        return this.results = this.items.synonyms.slice(0, RESULT_LIMIT)
      }
      // split into query parts
      const queryParts = query.split(" ")
      // results array
      const results = []
      // filter by exact tags
      const exactMatches = this.items.synonyms.filter(item => (
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
      const remaining = this.items.synonyms.filter(item => !exactMatches.includes(item))
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
    copyEmoji(item) {
      // set as copied item
      this.search.copied = item.data
      // clear any previous timeout
      clearTimeout(this.searchTime)
      // clear copied status
      this.searchTime = setTimeout(() => this.search.copied = null, 1200)
      // write into clipboard data
      navigator.clipboard.writeText(item.data)
    },
    // enhance text input
    enhanceText() {
      // clear previous output
      this.enhance.output = ""
      // simplify and trim input query
      const query = this.enhance.input.trim().replaceAll("  ", " ")
      // return and focus if empty text
      if (!query) { return document.querySelector(".enhance textarea").focus() }
      // split into words and results mapping
      const results = query.split(" ").map(word => {
        // simplify by removing symbols
        const text = word.toLowerCase().trim().replace(/[^a-z0-9]/gi, "")
        // return if word not long enough
        if (text.length < 3) { return word }
        // return if should be ignored
        if (IGNORE_WORDS.includes(text)) { return word }
        // find an exact matches from emojis
        const matches = this.items.original.filter(item => (
          // check if word included in tags
          item.tags.includes(text)
        )).sort((a, b) => (
          // priority for matching with name
          a.name === text || a.name.startsWith(text) || a.name.endsWith(text) ? -1
            // priority for less tags
            : a.tags.length > b.tags.length ? 1 : 0
        ))
        // return word and emoji
        return matches.length ? `${word} ${matches[0].data}` : word
      })
      // set output
      this.enhance.output = results.join(" ")
    },
    // copy text to clipboard
    copyText() {
      // set as copied
      this.enhance.copied = true
      // clear any previous timeout
      clearTimeout(this.enhanceTime)
      // clear copied status
      this.enhanceTime = setTimeout(() => this.enhance.copied = false, 1200)
      // write into clipboard data
      navigator.clipboard.writeText(this.enhance.output)
    }
  },
  // mounted listener
  async mounted() {
    // load all emoji items
    this.items = await loadEmojis()
    // slice initial results
    this.results = this.items.synonyms.slice(0, RESULT_LIMIT)
    // fetch config data
    const data = await fetch(BASE_URL + "index.json").then(resp => resp.json())
    // load ignoring words
    IGNORE_WORDS.push(...data.IGNORE_WORDS)
    // set as ready
    setTimeout(() => this.ready = true, 800)
  }
})
