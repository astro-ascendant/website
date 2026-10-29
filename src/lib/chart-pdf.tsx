import { Document, Page } from "@formepdf/react";
import { DataTable } from "@/components/pdf/data-table/data-table";
import { Heading } from "@/components/pdf/heading/heading";
import { KeyValue } from "@/components/pdf/key-value/key-value";
import { PageNumber } from "@/components/pdf/page-number/page-number";
import { Section } from "@/components/pdf/section/section";
import { Text } from "@/components/pdf/text/text";
import { PdfcnThemeProvider } from "@/components/pdf/theme-provider";
import type { ChartDashaPeriod, ChartResult } from "@/lib/chart";
import { formatSignifyingHouses } from "@/lib/chart-report";
import { formatDashaDate } from "@/lib/dasha-time";
import { formatLongitude } from "@/lib/zodiac";

type Row = Record<string, string>;

function Table({
  columns,
  rows,
}: {
  columns: readonly (readonly [key: string, header: string])[];
  rows: Row[];
}) {
  return (
    <DataTable
      size="compact"
      stripe
      columns={columns.map(([key, header]) => ({ key, header }))}
      data={rows}
    />
  );
}

function placementRows(result: ChartResult, division: number): Row[] {
  const match = result.divisions.find((entry) => entry.division === division);
  return (match?.placements ?? []).map((row) => ({
    body: row.body,
    sign: row.sign,
    degree: formatLongitude(row.longitude),
    house: String(row.house),
    star: row.star === "" ? "" : `${row.star}${row.pada ?? ""}`,
    state: row.state,
  }));
}

function dashaRows(periods: readonly ChartDashaPeriod[]): Row[] {
  return periods.map((period) => ({
    period: period.mahadasha,
    start: formatDashaDate(period.start),
    end: formatDashaDate(period.end),
  }));
}

function DashaTable({
  title,
  periods,
}: {
  title: string;
  periods: readonly ChartDashaPeriod[];
}) {
  return (
    <Section>
      <Heading level={2}>{title}</Heading>
      <Table
        columns={[
          ["period", "Mahadasha"],
          ["start", "Start"],
          ["end", "End"],
        ]}
        rows={dashaRows(periods)}
      />
    </Section>
  );
}

function ChartDocument({ result }: { result: ChartResult }) {
  const { birth } = result;
  const details = [
    ...(birth.name.trim() === ""
      ? []
      : [{ key: "Name", value: birth.name }]),
    ...(birth.date === ""
      ? []
      : [{ key: "Birth", value: `${birth.date} ${birth.time}` }]),
    { key: "Place", value: birth.place },
    { key: "UTC", value: birth.utcIso },
    { key: "Coordinates", value: `${birth.latitude}, ${birth.longitude}` },
    { key: "Ayanamsa", value: result.astroParams.ayanamsa },
    { key: "House system", value: result.astroParams.houseSystem },
    {
      key: "Lagna",
      value: `${result.lagna.sign} ${formatLongitude(result.lagna.longitude)}`,
    },
  ];
  const placementColumns = [
    ["body", "Body"],
    ["sign", "Sign"],
    ["degree", "Degree"],
    ["house", "House"],
    ["star", "Star"],
    ["state", "State"],
  ] as const;
  return (
    <Document>
      <Page size="A4">
        <PdfcnThemeProvider>
          <Heading level={1}>Horoscope</Heading>
          <KeyValue items={details} divided />
          <Section>
            <Heading level={2}>Placements</Heading>
            <Table columns={placementColumns} rows={placementRows(result, 1)} />
          </Section>
          <DashaTable title="Vimshottari Dasha" periods={result.dasha.vimshottari} />
          <DashaTable title="Chara Dasha" periods={result.dasha.chara} />
          <DashaTable title="Sthira Dasha" periods={result.dasha.sthira} />
          {result.divisions
            .filter((division) => division.division !== 1)
            .map((division) => (
              <Section key={division.division}>
                <Heading level={2}>{`D${division.division} placements`}</Heading>
                <Table
                  columns={placementColumns}
                  rows={placementRows(result, division.division)}
                />
              </Section>
            ))}
          <Section>
            <Heading level={2}>Jaimini</Heading>
            <KeyValue
              items={[
                ...result.jaimini.karakas.map((karaka) => ({
                  key: karaka.role,
                  value: karaka.planet,
                })),
                { key: "Karakamsha", value: result.jaimini.karakamsha },
                { key: "Upapada", value: result.jaimini.upapada },
                ...result.jaimini.arudha.map((entry) => ({
                  key: `Arudha Pada ${entry.house}`,
                  value: entry.pada,
                })),
              ]}
              divided
            />
          </Section>
          <Section>
            <Heading level={2}>KP Chart</Heading>
            <Table
              columns={[
                ["name", "Body"],
                ["signLord", "Sign Lord"],
                ["starLord", "Star Lord"],
                ["subLord", "Sub Lord"],
                ["houses", "Signifying Houses"],
              ]}
              rows={result.kp.rows.map((row) => ({
                name: row.name,
                signLord: row.signLord,
                starLord: row.starLord,
                subLord: row.subLord,
                houses: formatSignifyingHouses(row.signifyingHouses),
              }))}
            />
          </Section>
          <Text variant="sm">
            This chart is interpretive guidance, not certainty or a substitute
            for medical, legal, or financial advice.
          </Text>
          <PageNumber fixed />
        </PdfcnThemeProvider>
      </Page>
    </Document>
  );
}

/** Renders the chart with pdfcn's Forme components into a PDF blob. */
export async function buildChartPdf(result: ChartResult): Promise<Blob> {
  const { renderDocument } = await import("@formepdf/core");
  const bytes = await renderDocument(<ChartDocument result={result} />);
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
