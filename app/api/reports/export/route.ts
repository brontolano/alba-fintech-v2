import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'csv'; // csv, xlsx, json
    const report = searchParams.get('report') || 'daily';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('startDate') || date;
    const endDate = searchParams.get('endDate') || date;
    const unitId = searchParams.get('unitId');

    const startOfPeriod = new Date(startDate + 'T00:00:00.000Z');
    const endOfPeriod = new Date(endDate + 'T23:59:59.999Z');

    let data: any[] = [];
    let filename = `${report}-${startDate}_${endDate}`;
    let columns: { header: string; key: string; width?: number }[] = [];

    switch (report) {
      case 'daily': {
        const pembayaran = await prisma.pembayaran.findMany({
          where: {
            tanggal: { gte: startOfPeriod, lte: endOfPeriod },
            status: 'LUNAS',
            ...(unitId && { tagihan: { unitId } }),
          },
          include: {
            tagihan: { include: { santri: true, unit: true } },
          },
          orderBy: { tanggal: 'desc' },
        });
        data = pembayaran.map(p => ({
          id: p.id,
          tanggal: p.tanggal.toISOString().split('T')[0],
          santri: p.tagihan?.santri?.name || '',
          nis: p.tagihan?.santri?.studentNumber || '',
          unit: p.tagihan?.unit?.name || '',
          nominal: p.nominal,
          tipe: p.tipe,
          keterangan: p.keterangan || '',
          buktiUrl: p.buktiUrl || '',
          kasir: '', // user relation not available
          metode: p.tipe === 'TUNAI' ? 'Tunai' : p.tipe === 'TRANSFER' ? 'Transfer' : p.tipe === 'TABUNGAN' ? 'Tabungan' : p.tipe,
        }));
        columns = [
          { header: 'ID', key: 'id', width: 30 },
          { header: 'Tanggal', key: 'tanggal', width: 15 },
          { header: 'Santri', key: 'santri', width: 25 },
          { header: 'NIS', key: 'nis', width: 20 },
          { header: 'Unit', key: 'unit', width: 20 },
          { header: 'Nominal', key: 'nominal', width: 20 },
          { header: 'Tipe', key: 'tipe', width: 15 },
          { header: 'Metode', key: 'metode', width: 15 },
          { header: 'Keterangan', key: 'keterangan', width: 30 },
          { header: 'Bukti', key: 'buktiUrl', width: 30 },
          { header: 'Kasir', key: 'kasir', width: 20 },
        ];
        break;
      }

      case 'monthly': {
        const monthlyPembayaran = await prisma.pembayaran.findMany({
          where: {
            tanggal: { gte: startOfPeriod, lte: endOfPeriod },
            status: 'LUNAS',
            ...(unitId && { tagihan: { unitId } }),
          },
          include: {
            tagihan: { include: { santri: true, unit: true } },
          },
          orderBy: { tanggal: 'desc' },
        });
        data = monthlyPembayaran.map(p => ({
          id: p.id,
          tanggal: p.tanggal.toISOString().split('T')[0],
          santri: p.tagihan?.santri?.name || '',
          nis: p.tagihan?.santri?.studentNumber || '',
          unit: p.tagihan?.unit?.name || '',
          nominal: p.nominal,
          tipe: p.tipe,
          keterangan: p.keterangan || '',
          kasir: '',
          metode: p.tipe === 'TUNAI' ? 'Tunai' : p.tipe === 'TRANSFER' ? 'Transfer' : p.tipe === 'TABUNGAN' ? 'Tabungan' : p.tipe,
        }));
        columns = [
          { header: 'ID', key: 'id', width: 30 },
          { header: 'Tanggal', key: 'tanggal', width: 15 },
          { header: 'Santri', key: 'santri', width: 25 },
          { header: 'NIS', key: 'nis', width: 20 },
          { header: 'Unit', key: 'unit', width: 20 },
          { header: 'Nominal', key: 'nominal', width: 20 },
          { header: 'Tipe', key: 'tipe', width: 15 },
          { header: 'Metode', key: 'metode', width: 15 },
          { header: 'Keterangan', key: 'keterangan', width: 30 },
          { header: 'Kasir', key: 'kasir', width: 20 },
        ];
        break;
      }

      case 'outstanding': {
        const tagihans = await prisma.tagihan.findMany({
          where: {
            status: { in: ['UNPAID', 'PARTIAL'] },
            ...(unitId && { unitId }),
          },
          include: {
            santri: true,
            pembayaran: true,
            unit: true,
            template: true,
          },
          orderBy: { tanggal: 'asc' },
        });
        data = tagihans.map(t => {
          const paid = t.pembayaran.filter(p => p.status === 'LUNAS').reduce((s, p) => s + p.nominal, 0);
          return {
            id: t.id,
            santri: t.santri?.name || '',
            nis: t.santri?.studentNumber || '',
            unit: t.unit?.name || '',
            nominal: t.totalNilai,
            paid,
            outstanding: t.totalNilai - paid,
            status: t.status,
            tanggal: t.tanggal.toISOString().split('T')[0],
            template: t.template?.name || '',
          };
        });
        columns = [
          { header: 'ID', key: 'id', width: 30 },
          { header: 'Santri', key: 'santri', width: 25 },
          { header: 'NIS', key: 'nis', width: 20 },
          { header: 'Unit', key: 'unit', width: 20 },
          { header: 'Template', key: 'template', width: 25 },
          { header: 'Total Tagihan', key: 'nominal', width: 20 },
          { header: 'Terbayar', key: 'paid', width: 20 },
          { header: 'Outstanding', key: 'outstanding', width: 20 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Tanggal', key: 'tanggal', width: 15 },
        ];
        break;
      }

      case 'tagihan': {
        const allTagihans = await prisma.tagihan.findMany({
          where: {
            ...(unitId && { unitId }),
            tanggal: { gte: startOfPeriod, lte: endOfPeriod },
          },
          include: {
            santri: true,
            pembayaran: true,
            unit: true,
            template: true,
          },
          orderBy: { tanggal: 'desc' },
        });
        data = allTagihans.map(t => {
          const paid = t.pembayaran.filter(p => p.status === 'LUNAS').reduce((s, p) => s + p.nominal, 0);
          return {
            id: t.id,
            santri: t.santri?.name || '',
            nis: t.santri?.studentNumber || '',
            unit: t.unit?.name || '',
            template: t.template?.name || '',
            nominal: t.totalNilai,
            paid,
            outstanding: t.totalNilai - paid,
            status: t.status,
            tanggal: t.tanggal.toISOString().split('T')[0],
            keterangan: '',
          };
        });
        columns = [
          { header: 'ID', key: 'id', width: 30 },
          { header: 'Santri', key: 'santri', width: 25 },
          { header: 'NIS', key: 'nis', width: 20 },
          { header: 'Unit', key: 'unit', width: 20 },
          { header: 'Template', key: 'template', width: 25 },
          { header: 'Total Tagihan', key: 'nominal', width: 20 },
          { header: 'Terbayar', key: 'paid', width: 20 },
          { header: 'Outstanding', key: 'outstanding', width: 20 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Tanggal', key: 'tanggal', width: 15 },
          { header: 'Keterangan', key: 'keterangan', width: 30 },
        ];
        break;
      }

      case 'tabungan': {
        const tabungans = await prisma.tabungan.findMany({
          where: {
            ...(unitId && { santri: { unitId } }),
          },
          include: {
            santri: true,
            transaksis: {
              where: {
                createdAt: { gte: startOfPeriod, lte: endOfPeriod },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        data = tabungans.flatMap(t =>
          t.transaksis.map(tx => ({
            id: tx.id,
            tanggal: tx.createdAt.toISOString().split('T')[0],
            santri: t.santri?.name || '',
            nis: t.santri?.studentNumber || '',
            noRekening: t.accountNumber,
            tipe: tx.tipe,
            kategori: tx.kategori,
            channel: tx.channel,
            nominal: tx.nominal,
            saldoSebelum: tx.nominal,
            saldoSesudah: 0,
            keterangan: tx.keterangan || '',
            buktiUrl: tx.buktiUrl || '',
            referensi: tx.referenceId || '',
          }))
        );
        columns = [
          { header: 'ID', key: 'id', width: 30 },
          { header: 'Tanggal', key: 'tanggal', width: 15 },
          { header: 'Santri', key: 'santri', width: 25 },
          { header: 'NIS', key: 'nis', width: 20 },
          { header: 'No Rekening', key: 'noRekening', width: 20 },
          { header: 'Tipe', key: 'tipe', width: 20 },
          { header: 'Kategori', key: 'kategori', width: 20 },
          { header: 'Channel', key: 'channel', width: 15 },
          { header: 'Nominal', key: 'nominal', width: 20 },
          { header: 'Keterangan', key: 'keterangan', width: 30 },
          { header: 'Bukti', key: 'buktiUrl', width: 30 },
          { header: 'Referensi', key: 'referensi', width: 30 },
        ];
        break;
      }

      case 'retail': {
        const retailTransactions = await prisma.retailTransaction.findMany({
          where: {
            createdAt: { gte: startOfPeriod, lte: endOfPeriod },
            ...(unitId && { retailUnitId: unitId }),
          },
          include: {
            retailUnit: true,
            santri: true,
            user: { select: { name: true } },
            items: { include: { product: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        data = retailTransactions.flatMap(rt =>
          rt.items.map(item => ({
            id: rt.id,
            tanggal: rt.createdAt.toISOString().split('T')[0],
            unit: rt.retailUnit?.name || '',
            santri: rt.santri?.name || 'Walk-in',
            nis: rt.santri?.studentNumber || '-',
            produk: item.product?.name || '',
            kodeProduk: item.product?.code || '',
            qty: item.quantity,
            harga: item.unitPrice,
            subtotal: item.subtotal,
            total: rt.totalAmount,
            metode: rt.paymentMethod,
            status: rt.status,
            kasir: rt.user?.name || '',
            keterangan: rt.keterangan || '',
          }))
        );
        columns = [
          { header: 'ID Transaksi', key: 'id', width: 30 },
          { header: 'Tanggal', key: 'tanggal', width: 15 },
          { header: 'Unit', key: 'unit', width: 20 },
          { header: 'Santri', key: 'santri', width: 25 },
          { header: 'NIS', key: 'nis', width: 20 },
          { header: 'Produk', key: 'produk', width: 25 },
          { header: 'Kode', key: 'kodeProduk', width: 15 },
          { header: 'Qty', key: 'qty', width: 8 },
          { header: 'Harga', key: 'harga', width: 15 },
          { header: 'Subtotal', key: 'subtotal', width: 15 },
          { header: 'Total Transaksi', key: 'total', width: 20 },
          { header: 'Metode', key: 'metode', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Kasir', key: 'kasir', width: 20 },
          { header: 'Keterangan', key: 'keterangan', width: 30 },
        ];
        break;
      }
    }

    if (type === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan');

      // Add title row
      worksheet.mergeCells('A1', `${String.fromCharCode(64 + columns.length)}1`);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Laporan ${report.charAt(0).toUpperCase() + report.slice(1)} - ${startDate} s.d. ${endDate}`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center' };

      // Add header row
      const headerRow = worksheet.getRow(3);
      columns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      headerRow.height = 25;

      // Add data rows
      data.forEach((row, rowIdx) => {
        const dataRow = worksheet.getRow(rowIdx + 4);
        columns.forEach((col, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          cell.value = row[col.key];
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          cell.alignment = { vertical: 'middle' };
          // Format numbers
          if (typeof row[col.key] === 'number' && (col.key === 'nominal' || col.key === 'paid' || col.key === 'outstanding' || col.key === 'harga' || col.key === 'subtotal' || col.key === 'total')) {
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
        });
      });

      // Set column widths
      columns.forEach((col, idx) => {
        worksheet.getColumn(idx + 1).width = col.width || 15;
      });

      // Auto filter
      worksheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: columns.length },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    if (type === 'csv' && data.length > 0) {
      const headers = columns.map(c => c.header).join(',');
      const rows = data.map(d => columns.map(c => `"${d[c.key] ?? ''}"`).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    return NextResponse.json({ data, count: data.length, columns: columns.map(c => c.header) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
  }
}