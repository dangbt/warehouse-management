import JSZip from 'jszip';
import { EinvoiceError, EINVOICE_MAX_FILES, EINVOICE_MAX_FILE_BYTES } from './einvoice.types';

export interface UploadedBlob {
  originalname: string;
  buffer: Buffer;
}
export interface XmlSource {
  fileName: string;
  buffer: Buffer;
}

/** Tổng dung lượng giải nén tối đa của mọi file trong 1 lần upload (chống zip bomb). */
const MAX_TOTAL_UNZIPPED = 50 * 1024 * 1024;

const isZip = (b: UploadedBlob) => /\.zip$/i.test(b.originalname) || (b.buffer[0] === 0x50 && b.buffer[1] === 0x4b);
const isXml = (name: string) => /\.xml$/i.test(name);

/** Gom danh sách file XML từ các file upload (.xml hoặc .zip chứa .xml). Quá 5MB/file ⇒ lỗi có mã. */
export async function collectXmlSources(files: UploadedBlob[]): Promise<XmlSource[]> {
  if (!files?.length) throw new EinvoiceError('EINVOICE_NO_FILES', 'Chưa chọn file hoá đơn nào');
  const out: XmlSource[] = [];
  let total = 0;
  const push = (fileName: string, buffer: Buffer) => {
    if (buffer.length > EINVOICE_MAX_FILE_BYTES) throw new EinvoiceError('EINVOICE_FILE_TOO_LARGE', `File ${fileName} vượt quá 5MB`);
    total += buffer.length;
    if (total > MAX_TOTAL_UNZIPPED) throw new EinvoiceError('EINVOICE_FILE_TOO_LARGE', 'Tổng dung lượng các file vượt giới hạn');
    if (out.length >= EINVOICE_MAX_FILES)
      throw new EinvoiceError('EINVOICE_TOO_MANY_FILES', `Tối đa ${EINVOICE_MAX_FILES} hoá đơn mỗi lần`);
    out.push({ fileName, buffer });
  };
  for (const f of files) {
    if (f.buffer.length > EINVOICE_MAX_FILE_BYTES)
      throw new EinvoiceError('EINVOICE_FILE_TOO_LARGE', `File ${f.originalname} vượt quá 5MB`);
    if (isZip(f)) {
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(f.buffer);
      } catch {
        throw new EinvoiceError('EINVOICE_ZIP_INVALID', `File ${f.originalname} không phải zip hợp lệ`);
      }
      const entries = Object.values(zip.files).filter((e) => !e.dir && isXml(e.name) && !e.name.includes('__MACOSX'));
      for (const e of entries) push(`${f.originalname}/${e.name}`, Buffer.from(await e.async('uint8array')));
    } else if (isXml(f.originalname)) {
      push(f.originalname, f.buffer);
    } else {
      throw new EinvoiceError('EINVOICE_UNSUPPORTED_FILE', `File ${f.originalname}: chỉ nhận .xml hoặc .zip`);
    }
  }
  if (!out.length) throw new EinvoiceError('EINVOICE_NO_FILES', 'Không tìm thấy file .xml nào');
  return out;
}
