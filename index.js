/** Loads and extracts emojis */
const loadEmojis = async () => {
  // fetch external content
  const data = await fetch("assets/objects/emojis.zip")
  // create archive
  const archive = new JSZip()
  // load from url
  await archive.loadAsync(data.blob())
  // parse and return emojis
  return JSON.parse(await archive.files["emojis.json"].async("string"))
}
