package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure.export;

import com.porto.ciops.coa.obs.identityaccess.audit.application.AuditExportRenderer;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditQueryStore.Row;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class DefaultAuditExportRenderer implements AuditExportRenderer {
    private final ObjectMapper json;
    public DefaultAuditExportRenderer(ObjectMapper json){this.json=json;}
    private static final List<String> COLUMNS=List.of("event_id","occurred_at_utc","event_type","actor_subject","actor_username",
        "actor_display_name","target","provider_id","outcome","trace_id","source_context");
    private static final List<String> PDF_COLUMNS=List.of("Identificador do evento","Data e hora (UTC)","Tipo de evento","Identificador do usuário","Usuário no cadastro",
        "Nome no cadastro","Recurso afetado","Provedor","Resultado","Identificador de rastreio","Contexto registrado");
    private static final Map<String,String> PDF_METADATA=Map.ofEntries(Map.entry("exportId","Referência da exportação"),Map.entry("generatedAt","Gerado em (UTC)"),
        Map.entry("requestedBy","Solicitante (identificador)"),Map.entry("purpose","Finalidade"),Map.entry("recordCount","Total de eventos"),Map.entry("filters","Filtros aplicados"),
        Map.entry("datasetSha256","SHA-256 dos dados"),Map.entry("actorNamesIncluded","Nomes do cadastro incluídos"),Map.entry("hashScope","Conferência do hash"),Map.entry("classification","Classificação"));
    private List<String> cells(Row r){return List.of(r.id().toString(),r.occurredAt().toString(),r.eventType(),r.actorSubject(),
        text(r.actorUsername()),text(r.actorDisplayName()),r.target(),text(r.providerId()),r.outcome(),text(r.traceId()),text(r.sourceContext()));}
    private static String text(String value){return value==null?"":value;}
    @Override
    public String contentType(String format){return switch(format){case "csv"->"text/csv; charset=utf-8";case "xlsx"->"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";case "pdf"->"application/pdf";default->"application/json; charset=utf-8";};}
    @Override
    public byte[] render(String format,Map<String,Object> metadata,List<Row> rows){
        try {
            return switch(format){case "csv"->csv(metadata,rows);case "xlsx"->xlsx(metadata,rows);case "pdf"->pdf(metadata,rows);
                default->json.writeValueAsBytes(Map.of("metadata",metadata,"events",rows));};
        }catch(IOException e){throw new IllegalStateException("Não foi possível gerar o arquivo de auditoria.",e);}
    }
    /** Quotes every field and neutralizes spreadsheet formulas, including leading whitespace. */
    static String csvCell(String value){
        String stripped=value.stripLeading();
        if(!stripped.isEmpty()&&"=+-@".indexOf(stripped.charAt(0))>=0||value.startsWith("\t")||value.startsWith("\r")||value.startsWith("\n"))value="'"+value;
        return "\""+value.replace("\"","\"\"")+"\"";
    }
    private byte[] csv(Map<String,Object> metadata,List<Row> rows){
        StringBuilder result=new StringBuilder("\ufeff");
        List<String> columns=new ArrayList<>(COLUMNS);columns.add("export_metadata_json");
        result.append(String.join(";",columns.stream().map(DefaultAuditExportRenderer::csvCell).toList())).append("\r\n");
        String context=json.writeValueAsString(metadata);
        for(Row row:rows){List<String> values=new ArrayList<>(cells(row));values.add(context);
            result.append(String.join(";",values.stream().map(DefaultAuditExportRenderer::csvCell).toList())).append("\r\n");}
        return result.toString().getBytes(StandardCharsets.UTF_8);
    }
    private byte[] xlsx(Map<String,Object> metadata,List<Row> rows)throws IOException{
        try(var workbook=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
            var sheet=workbook.createSheet("Eventos");var header=sheet.createRow(0);
            var bold=workbook.createFont();bold.setBold(true);var heading=workbook.createCellStyle();heading.setFont(bold);
            for(int c=0;c<COLUMNS.size();c++){var cell=header.createCell(c);cell.setCellValue(COLUMNS.get(c));cell.setCellStyle(heading);sheet.setColumnWidth(c,Math.min(c==6?60:30,255)*256);}
            int index=1;for(Row row:rows){var line=sheet.createRow(index++);var values=cells(row);
                // setCellValue(String) creates text, never a formula or an automatic hyperlink.
                for(int c=0;c<values.size();c++)line.createCell(c).setCellValue(values.get(c));}
            sheet.createFreezePane(0,1);sheet.setAutoFilter(new CellRangeAddress(0,rows.size(),0,COLUMNS.size()-1));
            var evidence=workbook.createSheet("Evidência");index=0;
            for(var entry:metadata.entrySet()){var line=evidence.createRow(index++);line.createCell(0).setCellValue(entry.getKey());
                line.createCell(1).setCellValue(entry.getValue() instanceof String s?s:json.writeValueAsString(entry.getValue()));}
            evidence.setColumnWidth(0,26*256);evidence.setColumnWidth(1,100*256);
            workbook.write(out);return out.toByteArray();
        }
    }
    private byte[] pdf(Map<String,Object> metadata,List<Row> rows)throws IOException{
        try(var document=new PDDocument();var out=new ByteArrayOutputStream();
            var fontStream=DefaultAuditExportRenderer.class.getResourceAsStream("/audit-fonts/NotoSans-Regular.ttf")){
            if(fontStream==null)throw new IOException("Audit font unavailable");
            var font=PDType0Font.load(document,fontStream);
            var lines=new ArrayList<String>();
            lines.add("Auditoria de segurança | Portal de Observabilidade");lines.add("Uso restrito — evidência da consulta");lines.add("");
            for(var entry:metadata.entrySet()){
                if(entry.getKey().equals("filters")&&entry.getValue() instanceof com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditFilter f){
                    lines.add("Período (UTC): "+f.since()+" até "+f.until());lines.add("Instante da consulta (UTC): "+f.snapshotAt());
                    lines.add("Ordenação: "+f.sort()+" / "+f.direction());
                    var selected=List.of(Map.entry("Busca geral",f.query()),Map.entry("Resultado",f.outcome()),Map.entry("Evento",f.eventType()),
                        Map.entry("Usuário",f.actor()),Map.entry("Recurso",f.target()),Map.entry("Provedor",f.providerId()),Map.entry("Rastreio",f.traceId()),Map.entry("Identificador do evento",f.eventId()));
                    for(var selection:selected)if(!selection.getValue().isEmpty())lines.add(selection.getKey()+": "+selection.getValue());
                }else lines.add(PDF_METADATA.getOrDefault(entry.getKey(),entry.getKey())+": "+(entry.getValue() instanceof String s?s:entry.getValue() instanceof Boolean b?(b?"Sim":"Não"):json.writeValueAsString(entry.getValue())));
            }
            lines.add("");lines.add("Eventos — horários em UTC, na ordenação da consulta");
            for(Row row:rows){
                lines.add("__AUDIT_EVENT_START__");lines.add("");var values=cells(row);for(int c=0;c<COLUMNS.size();c++)lines.add(PDF_COLUMNS.get(c)+": "+values.get(c));
            }
            // Preserve unsupported characters as explicit Unicode escapes instead of silently dropping data.
            var wrapped=new ArrayList<String>();
            for(String line:lines){StringBuilder safe=new StringBuilder();
                if(line.equals("__AUDIT_EVENT_START__")){wrapped.add(line);continue;}
                for(int code:line.codePoints().toArray()){
                    if(Character.isISOControl(code)){safe.append(String.format("\\u%04X",code));continue;}
                    String glyph=new String(Character.toChars(code));
                    try{font.encode(glyph);safe.append(glyph);}catch(IllegalArgumentException e){safe.append(String.format("[U+%04X]",code));}
                }
                String remaining=safe.toString();if(remaining.isEmpty())wrapped.add("");
                while(!remaining.isEmpty()){
                    int end=0;float width=0;while(end<remaining.length()){
                        int next=end+Character.charCount(remaining.codePointAt(end));float nextWidth=font.getStringWidth(remaining.substring(end,next))/1000*9;
                        if(width+nextWidth>510&&end>0)break;width+=nextWidth;end=next;
                    }
                    wrapped.add(remaining.substring(0,end));remaining=remaining.substring(end);
                }
            }
            int perPage=55;
            var blocks=new ArrayList<List<String>>();var block=new ArrayList<String>();
            for(String line:wrapped){if(line.equals("__AUDIT_EVENT_START__")){if(!block.isEmpty())blocks.add(block);block=new ArrayList<>();}else block.add(line);}
            if(!block.isEmpty())blocks.add(block);
            var pages=new ArrayList<List<String>>();var current=new ArrayList<String>();
            for(var group:blocks){
                if(!current.isEmpty()&&group.size()<=perPage&&current.size()+group.size()>perPage){pages.add(current);current=new ArrayList<>();}
                for(String line:group){if(current.size()==perPage){pages.add(current);current=new ArrayList<>();}current.add(line);}
            }
            if(!current.isEmpty())pages.add(current);
            int pageCount=pages.size();
            for(int pageIndex=0;pageIndex<pageCount;pageIndex++){
                var page=new PDPage(PDRectangle.A4);document.addPage(page);
                try(var content=new PDPageContentStream(document,page)){
                    content.beginText();content.setFont(font,8);content.newLineAtOffset(42,819);content.showText("Auditoria de segurança | "+metadata.get("exportId"));content.endText();
                    content.beginText();content.setFont(font,9);content.setLeading(13);content.newLineAtOffset(42,795);
                    int lineIndex=0;for(String line:pages.get(pageIndex)){content.setFont(font,pageIndex==0&&lineIndex==0?14:9);content.showText(line);content.newLine();lineIndex++;}
                    content.endText();content.beginText();content.setFont(font,8);content.newLineAtOffset(42,25);
                    content.showText("Uso restrito | "+metadata.get("exportId")+" | Página "+(pageIndex+1)+" de "+pageCount);content.endText();
                }
            }
            document.getDocumentInformation().setTitle("Auditoria de segurança");
            document.getDocumentInformation().setSubject("Exportação "+metadata.get("exportId"));
            document.save(out);return out.toByteArray();
        }
    }
}
