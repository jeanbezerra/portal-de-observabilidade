package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure.export;
import static org.assertj.core.api.Assertions.*;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditQueryStore.Row;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class AuditExportRendererTest {
    private final DefaultAuditExportRenderer renderer=new DefaultAuditExportRenderer(JsonMapper.builder().build());
    private final Row row=new Row(UUID.randomUUID(),Instant.EPOCH,"authentication.failed","actor","=HYPERLINK(\"https://example.test\")","local","FAILURE","trace","quoted;value\nnext","usuário","João da Conceição");
    private Map<String,Object> metadata(){return Map.of("exportId",UUID.randomUUID(),"recordCount",1,"purpose","Investigação de segurança","filters",Map.of("outcome","FAILURE"));}
    @Test void generatesUtf8JsonAndSpreadsheetSafeCsv(){
        var json=JsonMapper.builder().build().readTree(renderer.render("json",metadata(),List.of(row)));
        assertThat(json.get("events").get(0).get("actorDisplayName").asText()).isEqualTo("João da Conceição");
        String csv=new String(renderer.render("csv",metadata(),List.of(row)),StandardCharsets.UTF_8);
        assertThat(csv).startsWith("\ufeff\"event_id\"").contains("'"+"=HYPERLINK(").contains("João da Conceição").contains("export_metadata_json");
        for(String dangerous:List.of("=1+1","  +cmd","-cmd","@SUM(A1)","\t=1"))assertThat(DefaultAuditExportRenderer.csvCell(dangerous)).startsWith("\"'");
        assertThat(DefaultAuditExportRenderer.csvCell("a\"b;c")).isEqualTo("\"a\"\"b;c\"");
    }
    @Test void writesRealXlsxTextCellsAndEvidenceSheet()throws Exception{
        try(var workbook=new XSSFWorkbook(new ByteArrayInputStream(renderer.render("xlsx",metadata(),List.of(row))))){
            assertThat(workbook.getSheet("Eventos").getLastRowNum()).isEqualTo(1);
            var target=workbook.getSheet("Eventos").getRow(1).getCell(6);
            assertThat(target.getCellType()).isEqualTo(CellType.STRING);assertThat(target.getStringCellValue()).isEqualTo(row.target());
            assertThat(workbook.getSheet("Evidência")).isNotNull();
        }
    }
    @Test void writesPaginatedPdfWithAccentsMetadataAndNoLostRows()throws Exception{
        var evidence=new HashMap<String,Object>(metadata());evidence.put("recordCount",40);
        byte[] bytes=renderer.render("pdf",evidence,Collections.nCopies(40,row));
        java.nio.file.Files.write(java.nio.file.Path.of("target/audit-export-sample.pdf"),bytes);
        try(var document=Loader.loadPDF(bytes)){
            String text=new PDFTextStripper().getText(document);
            assertThat(document.getNumberOfPages()).isGreaterThan(1);assertThat(text).contains("João da Conceição","Finalidade","Investigação de segurança","Uso restrito");
            assertThat(text.split(row.id().toString(),-1).length-1).isEqualTo(40);
            var preview=new org.apache.pdfbox.rendering.PDFRenderer(document);
            javax.imageio.ImageIO.write(preview.renderImageWithDPI(0,110),"png",java.nio.file.Path.of("target/audit-export-first.png").toFile());
            javax.imageio.ImageIO.write(preview.renderImageWithDPI(document.getNumberOfPages()-1,110),"png",java.nio.file.Path.of("target/audit-export-last.png").toFile());
        }
    }
}
