import { Body, Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../auth/permissions.guard';
import { EINVOICE_MAX_FILE_BYTES, EINVOICE_MAX_FILES } from './einvoice.types';
import { EinvoiceService } from './einvoice.service';
import { SupplierItemMappingService, type MappingInput } from './supplier-item-mapping.service';
import type { UploadedBlob } from './einvoice-files';

/** Trần cứng của multer (chống nuốt RAM); file > 5MB do service trả EINVOICE_FILE_TOO_LARGE có mã. */
const UPLOAD_HARD_LIMIT = 4 * EINVOICE_MAX_FILE_BYTES;

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('import-orders/einvoice')
export class EinvoiceController {
  constructor(
    private svc: EinvoiceService,
    private mappings: SupplierItemMappingService,
  ) {}

  /** Upload .xml/.zip hoá đơn điện tử ⇒ dữ liệu đã parse (chưa tạo phiếu). Quá 5MB ⇒ lỗi EINVOICE_FILE_TOO_LARGE. */
  @Post('parse')
  @RequirePermissions('import_orders:create')
  @UseInterceptors(FilesInterceptor('files', EINVOICE_MAX_FILES, { limits: { fileSize: UPLOAD_HARD_LIMIT } }))
  parse(@UploadedFiles() files: UploadedBlob[]) {
    return this.svc.parseUploads(files);
  }

  @Post('mappings')
  @RequirePermissions('import_orders:create')
  saveMappings(@Body() body: { mappings: MappingInput[] }) {
    return this.mappings.saveMany(body?.mappings);
  }
}
