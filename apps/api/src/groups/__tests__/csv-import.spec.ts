import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { CsvImportService } from '../csv-import.service';
import { GroupsService } from '../groups.service';

describe('CsvImportService', () => {
  const prisma = new PrismaService();
  const service = new CsvImportService(prisma);
  const groups = new GroupsService(prisma);

  beforeAll(async () => { await prisma.$connect(); });
  afterEach(async () => { await prisma.target.deleteMany(); });
  afterAll(async () => {
    await prisma.target.deleteMany();
    await prisma.targetGroup.deleteMany();
    await prisma.$disconnect();
  });

  async function freshGroup(): Promise<string> {
    const g = await groups.create({ name: 'CSV ' + Math.random() });
    return g.id;
  }

  it('inserts well-formed rows', async () => {
    const groupId = await freshGroup();
    const csv = 'firstName,lastName,email,position\nA,B,a@corp.com,Dev\nC,D,c@corp.com,QA\n';
    const res = await service.importCsv(groupId, Buffer.from(csv));
    expect(res.inserted).toBe(2);
    expect(res.skipped).toHaveLength(0);
  });

  it('skips rows with a blank or invalid email, keeping the good ones', async () => {
    const groupId = await freshGroup();
    const csv = 'firstName,lastName,email,position\nA,B,,Dev\nC,D,not-an-email,QA\nE,F,good@corp.com,Ops\n';
    const res = await service.importCsv(groupId, Buffer.from(csv));
    expect(res.inserted).toBe(1);
    expect(res.skipped).toHaveLength(2);
    expect(res.skipped[0]).toHaveProperty('reason');
  });

  it('skips duplicate emails within the file and against the database', async () => {
    const groupId = await freshGroup();
    await service.importCsv(groupId, Buffer.from('firstName,lastName,email,position\nA,B,dup@corp.com,Dev\n'));
    const csv = 'firstName,lastName,email,position\nX,Y,dup@corp.com,Dev\nX,Y,new@corp.com,Dev\nZ,Z,new@corp.com,Dev\n';
    const res = await service.importCsv(groupId, Buffer.from(csv));
    expect(res.inserted).toBe(1);
    expect(res.skipped).toHaveLength(2);
  });

  it('rejects a file with the wrong headers', async () => {
    const groupId = await freshGroup();
    await expect(service.importCsv(groupId, Buffer.from('a,b,c\n1,2,3\n'))).rejects.toThrow();
  });

  it('rejects an empty file', async () => {
    const groupId = await freshGroup();
    await expect(service.importCsv(groupId, Buffer.from(''))).rejects.toThrow();
  });
});
