/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICES/INDEX.JS
   ===================================================================
   Ponte entre os ES modules e o restante do sistema (scripts clássicos).
   Expõe todos os serviços em window.PortariaServices para que qualquer
   página possa utilizá-los sem depender de imports.
   =================================================================== */

import { ConfigService } from './configService.js';
import { PdfService } from './pdfService.js';
import { EmailService } from './emailService.js';
import { EmailDraft } from './emailDraft.js';
import { FileService } from './fileService.js';
import { ReportService } from './reportService.js';

window.PortariaServices = {
  ConfigService,
  PdfService,
  EmailService,
  EmailDraft,
  FileService,
  ReportService
};
