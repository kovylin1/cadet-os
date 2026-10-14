/*
 * Turns an uploaded result file into plain text, entirely in the browser.
 * Both libraries are loaded on demand so they don't weigh down the app.
 * OCR downloads its English language data once (≈ 10 MB, then cached);
 * the image itself never leaves the device.
 */

export type ReadProgress = (message: string) => void

export async function readResultFile(file: File, onProgress?: ReadProgress): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return readPdf(file, onProgress)
  if (file.type.startsWith('image/')) return readImage(file, onProgress)
  if (file.type.startsWith('text/') || /\.(txt|csv)$/i.test(file.name)) return file.text()
  throw new Error('Use a screenshot (PNG/JPG), a PDF or a text file.')
}

async function readPdf(file: File, onProgress?: ReadProgress): Promise<string> {
  onProgress?.('Reading PDF…')
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  const text = pages.join('\n').trim()
  if (!text) throw new Error('This PDF has no readable text (it may be a scanned image). Try a screenshot instead.')
  return text
}

async function readImage(file: File, onProgress?: ReadProgress): Promise<string> {
  onProgress?.('Loading text recognition…')
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', undefined, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(`Reading image… ${Math.round(m.progress * 100)}%`)
    },
  })
  try {
    const { data } = await worker.recognize(await prepareImage(file))
    return data.text
  } finally {
    await worker.terminate()
  }
}

/**
 * OCR reads dark-on-light text best. Result screens are often light-on-dark,
 * so convert to greyscale, invert dark images and upscale small ones.
 */
async function prepareImage(file: File): Promise<HTMLCanvasElement | File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = bitmap.width < 1400 ? 2 : 1
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width * scale
    canvas.height = bitmap.height * scale
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const px = img.data
    let sum = 0
    for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    const dark = sum / (px.length / 4) < 128
    for (let i = 0; i < px.length; i += 4) {
      let y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      if (dark) y = 255 - y
      px[i] = px[i + 1] = px[i + 2] = y
    }
    ctx.putImageData(img, 0, 0)
    return canvas
  } catch {
    return file
  }
}
