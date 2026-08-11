from __future__ import annotations

import argparse
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor('#0D2239')
BLUE = colors.HexColor('#1684A5')
GOLD = colors.HexColor('#E6B85E')
INK = colors.HexColor('#21384B')
MUTED = colors.HexColor('#637789')
PALE = colors.HexColor('#EEF5F7')
RED = colors.HexColor('#A82E3B')
WHITE = colors.white


def font_setup() -> tuple[str, str]:
    windows = Path('C:/Windows/Fonts')
    regular = windows / 'arial.ttf'
    bold = windows / 'arialbd.ttf'
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont('ManualRegular', regular))
        pdfmetrics.registerFont(TTFont('ManualBold', bold))
        return 'ManualRegular', 'ManualBold'
    return 'Helvetica', 'Helvetica-Bold'


REGULAR, BOLD = font_setup()


def styles():
    base = getSampleStyleSheet()
    return {
        'cover_title': ParagraphStyle('cover_title', parent=base['Title'], fontName=BOLD, fontSize=34, leading=37, textColor=WHITE, alignment=TA_LEFT, spaceAfter=8),
        'cover_subtitle': ParagraphStyle('cover_subtitle', parent=base['BodyText'], fontName=REGULAR, fontSize=13, leading=19, textColor=colors.HexColor('#C7D6E0')),
        'title': ParagraphStyle('title', parent=base['Heading1'], fontName=BOLD, fontSize=22, leading=27, textColor=NAVY, spaceAfter=13),
        'heading': ParagraphStyle('heading', parent=base['Heading2'], fontName=BOLD, fontSize=13, leading=17, textColor=BLUE, spaceBefore=10, spaceAfter=6),
        'body': ParagraphStyle('body', parent=base['BodyText'], fontName=REGULAR, fontSize=9.2, leading=13.4, textColor=INK, spaceAfter=7),
        'small': ParagraphStyle('small', parent=base['BodyText'], fontName=REGULAR, fontSize=8.2, leading=11.5, textColor=MUTED),
        'code': ParagraphStyle('code', parent=base['Code'], fontName='Courier', fontSize=8.1, leading=11, textColor=NAVY, leftIndent=7, rightIndent=7, spaceBefore=4, spaceAfter=7),
        'table_head': ParagraphStyle('table_head', parent=base['BodyText'], fontName=BOLD, fontSize=8, leading=10, textColor=WHITE),
        'table_body': ParagraphStyle('table_body', parent=base['BodyText'], fontName=REGULAR, fontSize=7.8, leading=10.5, textColor=INK),
        'step_no': ParagraphStyle('step_no', parent=base['BodyText'], fontName=BOLD, fontSize=13, leading=16, alignment=TA_CENTER, textColor=WHITE),
        'step_title': ParagraphStyle('step_title', parent=base['BodyText'], fontName=BOLD, fontSize=9.5, leading=12, textColor=NAVY, spaceAfter=2),
        'step_body': ParagraphStyle('step_body', parent=base['BodyText'], fontName=REGULAR, fontSize=8.2, leading=11.5, textColor=INK),
    }


S = styles()


def p(text: str, style: str = 'body') -> Paragraph:
    return Paragraph(text, S[style])


def code(text: str) -> Table:
    table = Table([[Paragraph(text, S['code'])]], colWidths=[164 * mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PALE),
        ('BOX', (0, 0), (-1, -1), .5, colors.HexColor('#C8DBE2')),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return table


def info_box(title: str, body: str, accent=BLUE) -> Table:
    content = [[p(title, 'step_title')], [p(body, 'step_body')]]
    table = Table(content, colWidths=[160 * mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F5F9FA')),
        ('LINEBEFORE', (0, 0), (0, -1), 4, accent),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
    ]))
    return table


def data_table(headers: list[str], rows: list[list[str]], widths: list[float]) -> Table:
    data = [[p(item, 'table_head') for item in headers]]
    data.extend([[p(item, 'table_body') for item in row] for row in rows])
    table = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('GRID', (0, 0), (-1, -1), .35, colors.HexColor('#CEDCE2')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, colors.HexColor('#F7FAFB')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return table


def step(number: int, title: str, body: str) -> Table:
    badge = Table([[p(str(number), 'step_no')]], colWidths=[11 * mm], rowHeights=[11 * mm])
    badge.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), BLUE), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    detail = [p(title, 'step_title'), p(body, 'step_body')]
    table = Table([[badge, detail]], colWidths=[15 * mm, 145 * mm])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    return table


def page_header() -> Table:
    label = Paragraph('Sistema de Cartera Eli - Version 1.0.2', ParagraphStyle(
        'page_header', fontName=BOLD, fontSize=8, leading=10, textColor=NAVY,
    ))
    table = Table([[label]], colWidths=[160 * mm])
    table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), .6, colors.HexColor('#D7E3E8')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return table


def header_footer(canvas, doc):
    width, height = letter
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, width, height, stroke=0, fill=1)
        canvas.setFillColor(BLUE)
        canvas.circle(width - 35 * mm, height - 25 * mm, 34 * mm, stroke=0, fill=1)
        canvas.setFillColor(GOLD)
        canvas.circle(-7 * mm, 18 * mm, 28 * mm, stroke=0, fill=1)
    else:
        canvas.setFont(REGULAR, 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(width - 20 * mm, 11 * mm, f'Pagina {doc.page}')
    canvas.restoreState()


def build(output: Path):
    output.parent.mkdir(parents=True, exist_ok=True)
    width, height = letter
    doc = BaseDocTemplate(
        str(output), pagesize=letter,
        title='Sistema de Cartera Eli - Manual de instalacion 1.0.2',
        author='Sistema de Cartera Eli',
    )
    frame = Frame(22 * mm, 18 * mm, width - 44 * mm, height - 40 * mm, id='manual', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id='manual-pages', frames=[frame], onPage=header_footer)])
    story = []

    story += [
        Spacer(1, 55 * mm),
        p('SISTEMA DE CARTERA ELI', 'small'),
        Spacer(1, 4 * mm),
        p('Sistema de<br/>Cartera Eli', 'cover_title'),
        p('Manual de instalacion, operacion y respaldo', 'cover_subtitle'),
        Spacer(1, 9 * mm),
        Table([[p('VERSION 1.0.2', 'table_head')]], colWidths=[40 * mm], style=[('BACKGROUND', (0, 0), (-1, -1), GOLD), ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]),
        Spacer(1, 13 * mm),
        p('Aplicacion local compuesta por Angular, NestJS y PostgreSQL, distribuida como imagenes Docker precompiladas.', 'cover_subtitle'),
        Spacer(1, 35 * mm),
        p('Documento de entrega - 11 de agosto de 2026', 'small'),
        PageBreak(),
    ]

    story += [
        page_header(),
        Spacer(1, 5 * mm),
        p('1. Antes de instalar', 'title'),
        p('Este paquete instala el sistema completo en un solo computador. La aplicacion se abre en el navegador, pero los datos permanecen localmente en PostgreSQL dentro de Docker.'),
        p('Requisitos', 'heading'),
        data_table(['Requisito', 'Indicacion'], [
            ['Sistema operativo', 'Windows 10 u 11 de 64 bits.'],
            ['Memoria', '8 GB de RAM recomendados.'],
            ['Almacenamiento', '10 GB libres como minimo para Docker, datos y respaldos.'],
            ['Virtualizacion', 'Debe estar habilitada. Docker puede solicitar WSL2.'],
            ['Software', 'Docker Desktop y un navegador Chrome o Edge.'],
        ], [47, 113]),
        Spacer(1, 5 * mm),
        info_box('No instale componentes adicionales', 'El cliente no necesita instalar PostgreSQL, Node.js, Angular, pnpm, Nginx ni Microsoft Excel. Todo lo necesario ya esta incluido en las imagenes Docker.'),
        p('Preparacion de la carpeta', 'heading'),
        p('Copie la carpeta completa <b>Sistema-Cartera-Eli-1.0.2</b> en una ubicacion local, preferiblemente:'),
        code(r'C:\SistemaCarteraEli'),
        info_box('Evite OneDrive', 'No instale el sistema dentro de una carpeta sincronizada por OneDrive. Esto reduce problemas de bloqueo, sincronizacion y copias incompletas.', GOLD),
        PageBreak(),
    ]

    story += [
        page_header(),
        Spacer(1, 5 * mm),
        p('2. Primera instalacion', 'title'),
        step(1, 'Instale Docker Desktop', 'Realice la instalacion con permisos de administrador. Si Windows solicita WSL2 o reiniciar el equipo, complete esos pasos.'),
        step(2, 'Abra Docker Desktop', 'Espere hasta que Docker indique que el motor esta funcionando. Mantengalo abierto durante la instalacion.'),
        step(3, 'Abra PowerShell en la carpeta', 'Entre a la carpeta donde copio el paquete. Puede hacer clic en la barra de direccion del Explorador, escribir powershell y presionar Enter.'),
        step(4, 'Ejecute el instalador', 'El instalador carga las imagenes, inicia PostgreSQL, restaura la base incluida y verifica la aplicacion.'),
        code(r'powershell -ExecutionPolicy Bypass -File .\scripts\instalar.ps1'),
        step(5, 'Espere la confirmacion', 'Al finalizar debe aparecer: Sistema instalado correctamente. El navegador abrira automaticamente la direccion local.'),
        code('http://localhost:8080'),
        step(6, 'Inicie sesion', 'Use el usuario y la contrasena entregados por el administrador. La base incluida conserva la contrasena vigente en la fecha de entrega; puede no ser 1234.'),
        info_box('Instalador seguro ante repeticiones', 'Si encuentra una base existente, el instalador la conserva y no vuelve a cargar el respaldo inicial. Esto evita reemplazar datos por ejecutar el instalador nuevamente.'),
        PageBreak(),
    ]

    story += [
        page_header(),
        Spacer(1, 5 * mm),
        p('3. Uso diario', 'title'),
        p('Docker Desktop debe estar abierto. Los contenedores estan configurados para reiniciarse automaticamente mientras Docker este funcionando.'),
        p('Iniciar y abrir el sistema', 'heading'),
        code(r'powershell -ExecutionPolicy Bypass -File .\scripts\iniciar.ps1'),
        p('Detener el sistema sin borrar informacion', 'heading'),
        code(r'powershell -ExecutionPolicy Bypass -File .\scripts\detener.ps1'),
        data_table(['Accion', 'Resultado'], [
            ['Cerrar el navegador', 'No detiene el servidor ni borra datos.'],
            ['Apagar Windows', 'Los datos permanecen guardados en el volumen local.'],
            ['Ejecutar detener.ps1', 'Detiene los servicios y conserva PostgreSQL.'],
            ['Ejecutar iniciar.ps1', 'Inicia los servicios y abre el navegador.'],
        ], [57, 103]),
        Spacer(1, 5 * mm),
        info_box('Accion prohibida', 'Nunca ejecute <b>docker compose down -v</b>. La opcion -v elimina el volumen que contiene PostgreSQL y puede provocar la perdida total de la informacion.', RED),
        p('Direccion y puerto', 'heading'),
        p('La direccion predeterminada es <b>http://localhost:8080</b>. El puerto puede modificarse en el archivo .env si 8080 esta ocupado, pero el cambio debe realizarlo el responsable tecnico.'),
        PageBreak(),
    ]

    story += [
        page_header(),
        Spacer(1, 5 * mm),
        p('4. Respaldos y restauracion', 'title'),
        p('La carpeta del programa no contiene por si sola la base que esta en uso. Los respaldos SQL son el mecanismo de recuperacion y traslado de la informacion.'),
        p('Crear un respaldo', 'heading'),
        code(r'powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1'),
        p('Los archivos quedan en la carpeta backups con nombres como <b>cartera_20260811_180000.sql</b>. Cree un respaldo al terminar cada jornada y copie periodicamente esa carpeta a una unidad externa o almacenamiento seguro.'),
        p('Restaurar un respaldo', 'heading'),
        code(r'powershell -ExecutionPolicy Bypass -File .\scripts\restaurar.ps1 -BackupPath .\backups\cartera_YYYYMMDD_HHMMSS.sql'),
        p('El sistema pedira escribir RESTAURAR. Antes de reemplazar la base actual, el script crea automaticamente un respaldo preventivo.'),
        info_box('Prueba de recuperacion', 'No basta con guardar copias. Realice periodicamente una restauracion de prueba en otro computador para confirmar que el respaldo puede recuperarse.'),
        p('Politica recomendada', 'heading'),
        data_table(['Frecuencia', 'Destino', 'Retencion'], [
            ['Diaria', 'Carpeta backups local', 'Ultimos 7 dias'],
            ['Semanal', 'Unidad externa', 'Ultimas 8 semanas'],
            ['Mensual', 'Ubicacion segura externa', '12 meses'],
        ], [38, 76, 46]),
        PageBreak(),
    ]

    story += [
        page_header(),
        Spacer(1, 5 * mm),
        p('5. Diagnostico y soporte', 'title'),
        p('Si el sistema no abre, ejecute:'),
        code(r'powershell -ExecutionPolicy Bypass -File .\scripts\estado.ps1'),
        p('El script muestra el estado de los servicios y guarda un archivo dentro de logs. Envie ese archivo al responsable tecnico sin modificarlo.'),
        p('Comprobaciones rapidas', 'heading'),
        data_table(['Problema', 'Comprobacion'], [
            ['No abre localhost:8080', 'Abra Docker Desktop y ejecute iniciar.ps1.'],
            ['Docker no responde', 'Espere a que termine de iniciar o reinicie Docker Desktop.'],
            ['Puerto ocupado', 'Solicite cambiar APP_PORT en .env.'],
            ['No puede iniciar sesion', 'Verifique usuario, contrasena y mayusculas. No reinstale la base.'],
            ['Equipo nuevo', 'Instale el paquete y restaure el respaldo mas reciente.'],
        ], [55, 105]),
        p('Proteccion de credenciales', 'heading'),
        p('No comparta el archivo .env ni los respaldos SQL con personas no autorizadas. Ambos forman parte sensible de la instalacion. Cada usuario debe utilizar su propia cuenta del sistema.'),
        p('Novedades de la version 1.0.2', 'heading'),
        p('Incluye saldo pendiente historico por pago, selector tabular y paginado de clientes cobrables, seleccion exacta de prestamos por cliente, validacion de sobrepagos e indices de base de datos para conservar el rendimiento.'),
        p('Informacion para soporte', 'heading'),
        p('Al solicitar ayuda indique la version <b>1.0.2</b>, describa la accion realizada y adjunte el diagnostico generado por estado.ps1. No elimine contenedores ni volumenes antes de recibir instrucciones.'),
        Spacer(1, 5 * mm),
        info_box('ENTREGA VERIFICADA', 'Frontend Angular, API NestJS y PostgreSQL en Docker.', GOLD),
    ]

    doc.build(story)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    build(args.output)
