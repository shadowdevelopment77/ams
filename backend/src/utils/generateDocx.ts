import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  HeadingLevel, BorderStyle, convertInchesToTwip,
} from "docx"
import fs from "fs"
import https from "https"
import http from "http"

interface PhotoData {
  id: number
  photo_url: string
  caption: string
  check_in_at: Date
  staff_name: string
  item_description: string
}

interface GenerateDocxInput {
  company: { name: string; logo_url: string | null; address: string | null }
  division: { name: string }
  period_month: number
  period_year: number
  photos: PhotoData[]
  template: any
  snapshot: any
  photos_per_row: number
  output_path: string
  report_mode: string
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

// download image from URL into buffer
const fetchImageBuffer = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http
    client.get(url, (res) => {
      const chunks: Buffer[] = []
      res.on("data", (chunk) => chunks.push(chunk))
      res.on("end", () => resolve(Buffer.concat(chunks)))
      res.on("error", reject)
    }).on("error", reject)
  })
}

export const generateDocx = async (input: GenerateDocxInput) => {
  const {
    company, division, period_month, period_year,
    photos, template, snapshot, photos_per_row, output_path, report_mode,
  } = input

  const sections: Paragraph[] = []

  // ── HEADER ──────────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      text: snapshot.report_title ?? `LAPORAN KEGIATAN ${division.name.toUpperCase()}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: company.name.toUpperCase(),
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `Periode: ${MONTHS[period_month - 1]} ${period_year}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  )

  // ── NARRATIVE SECTIONS ──────────────────────────────────────────
  if (report_mode !== "PHOTO_ONLY") {
    const narrativeSections = [
      { label: "I. PENDAHULUAN", content: snapshot.section_intro },
      { label: "II. LATAR BELAKANG", content: snapshot.section_background },
      { label: "III. TUJUAN", content: snapshot.section_purpose },
      { label: "IV. TUGAS UMUM", content: snapshot.section_duties },
      { label: "V. SASARAN", content: snapshot.section_scope },
      { label: "VI. WAKTU PELAKSANAAN", content: snapshot.section_schedule },
      { label: "VII. EVALUASI", content: snapshot.section_evaluation },
      { label: "VIII. SARAN", content: snapshot.section_suggestion },
      { label: "IX. PENUTUP", content: snapshot.section_closing },
    ]

    for (const section of narrativeSections) {
      if (!section.content) continue
      sections.push(
        new Paragraph({
          text: section.label,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        }),
        new Paragraph({
          text: section.content,
          spacing: { after: 200 },
        }),
      )
    }
  }

  // ── PHOTO GRID ───────────────────────────────────────────────────
  if (report_mode !== "NARRATIVE_ONLY" && photos.length > 0) {
    sections.push(
      new Paragraph({
        text: "DOKUMENTASI KEGIATAN",
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 300 },
      }),
    )

    // chunk photos into rows
    const rows: PhotoData[][] = []
    for (let i = 0; i < photos.length; i += photos_per_row) {
      rows.push(photos.slice(i, i + photos_per_row))
    }

    for (const row of rows) {
      const cells: TableCell[] = []

      for (const photo of row) {
        try {
          const buffer = await fetchImageBuffer(photo.photo_url)

          cells.push(
            new TableCell({
              width: { size: Math.floor(100 / photos_per_row), type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: buffer,
                      transformation: { width: 200, height: 150 },
                      type: "jpg",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  text: photo.caption,
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100, after: 200 },
                  children: [
                    new TextRun({
                      text: photo.caption,
                      size: 18,
                      italics: true,
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
            })
          )
        } catch {
          // skip failed image downloads
          console.error(`Failed to fetch image: ${photo.photo_url}`)
        }
      }

      // fill empty cells if row is not full
      while (cells.length < photos_per_row) {
        cells.push(new TableCell({
          width: { size: Math.floor(100 / photos_per_row), type: WidthType.PERCENTAGE },
          children: [new Paragraph({ text: "" })],
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
        }))
      }

      sections.push(
        new Paragraph({ children: [] }), // spacer
      )

      // add photo table row
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: cells })],
      })

      // push table — note: Table is not a Paragraph so cast
      sections.push(table as any)
    }
  }

  // ── SIGNERS ──────────────────────────────────────────────────────
  const signers = template.signers ? JSON.parse(template.signers as string) : []
  if (signers.length > 0) {
    sections.push(
      new Paragraph({ text: "", spacing: { before: 600 } }),
    )

    const signerCells = signers.map((signer: { name: string; title: string }) =>
      new TableCell({
        width: { size: Math.floor(100 / signers.length), type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            text: signer.title,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "\n\n\n",
            spacing: { before: 800 },
          }),
          new Paragraph({
            text: signer.name,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: signer.name, bold: true, underline: {} })],
          }),
        ],
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
      })
    )

    const signerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: signerCells })],
    })

    sections.push(signerTable as any)
  }

  // ── BUILD DOCUMENT ───────────────────────────────────────────────
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(output_path, buffer)
}