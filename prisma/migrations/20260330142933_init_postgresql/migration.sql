-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "udyamNumber" TEXT,
    "sector" TEXT NOT NULL,
    "subSector" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "employeeCount" INTEGER,
    "turnoverBracket" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "gridRegion" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingPeriod" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "baseYearFlag" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityData" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "scope" INTEGER NOT NULL,
    "sourceCategory" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "description" TEXT,
    "inputMode" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "spendInr" DOUBLE PRECISION,
    "dataQualityFlag" TEXT NOT NULL DEFAULT 'SECONDARY',
    "month" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmissionFactor" (
    "id" TEXT NOT NULL,
    "fuelOrActivity" TEXT NOT NULL,
    "scope" INTEGER NOT NULL,
    "scopeCategory" TEXT NOT NULL,
    "co2Ef" DOUBLE PRECISION NOT NULL,
    "ch4Ef" DOUBLE PRECISION,
    "n2oEf" DOUBLE PRECISION,
    "efUnit" TEXT NOT NULL,
    "region" TEXT,
    "source" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "sourceUrl" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "EmissionFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculatedEmission" (
    "id" TEXT NOT NULL,
    "activityDataId" TEXT NOT NULL,
    "efId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "co2Tonnes" DOUBLE PRECISION NOT NULL,
    "ch4Co2eTonnes" DOUBLE PRECISION NOT NULL,
    "n2oCo2eTonnes" DOUBLE PRECISION NOT NULL,
    "totalCo2eTonnes" DOUBLE PRECISION NOT NULL,
    "calculationMethod" TEXT NOT NULL,
    "calculationSteps" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculatedEmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "scope1Total" DOUBLE PRECISION NOT NULL,
    "scope2Total" DOUBLE PRECISION NOT NULL,
    "scope3Total" DOUBLE PRECISION NOT NULL,
    "scope3ByCategory" TEXT,
    "energyConsumedGj" DOUBLE PRECISION NOT NULL,
    "renewablePercent" DOUBLE PRECISION,
    "intensityPerTurnover" DOUBLE PRECISION,
    "intensityPerProduct" DOUBLE PRECISION,
    "intensityPerEmployee" DOUBLE PRECISION,
    "dataQualityScore" DOUBLE PRECISION NOT NULL,
    "reportFormat" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelProperty" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "density" DOUBLE PRECISION,
    "ncvTjPerGg" DOUBLE PRECISION,
    "co2EfKgPerTj" DOUBLE PRECISION,
    "defaultPriceInr" DOUBLE PRECISION,
    "alternateUnits" TEXT,
    "commonMsmeUse" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "FuelProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GwpValue" (
    "id" TEXT NOT NULL,
    "gas" TEXT NOT NULL,
    "gwp" DOUBLE PRECISION NOT NULL,
    "assessmentReport" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceUrl" TEXT,

    CONSTRAINT "GwpValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitConversion" (
    "id" TEXT NOT NULL,
    "fromUnit" TEXT NOT NULL,
    "toUnit" TEXT NOT NULL,
    "factor" DOUBLE PRECISION NOT NULL,
    "fuelCode" TEXT,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "UnitConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorBenchmark" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "subSector" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "bestPractice" DOUBLE PRECISION NOT NULL,
    "sectorAverage" DOUBLE PRECISION NOT NULL,
    "worstQuartile" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "year" INTEGER NOT NULL,

    CONSTRAINT "SectorBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReductionTechnology" (
    "id" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "applicableSectors" TEXT NOT NULL,
    "scopeAddressed" TEXT NOT NULL,
    "energyTypeSaved" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "energySavingMinPct" DOUBLE PRECISION NOT NULL,
    "energySavingMaxPct" DOUBLE PRECISION NOT NULL,
    "co2ReductionMinPct" DOUBLE PRECISION NOT NULL,
    "co2ReductionMaxPct" DOUBLE PRECISION NOT NULL,
    "paybackMinYears" DOUBLE PRECISION NOT NULL,
    "paybackMaxYears" DOUBLE PRECISION NOT NULL,
    "capexMinLakhs" DOUBLE PRECISION,
    "capexMaxLakhs" DOUBLE PRECISION,
    "technologyReadiness" TEXT NOT NULL,
    "demonstratedInIndia" BOOLEAN NOT NULL,
    "indianClusters" TEXT,
    "matchesFuelTypes" TEXT,
    "matchesCategories" TEXT,
    "matchesSubSectors" TEXT,
    "minEmissionThreshold" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,

    CONSTRAINT "ReductionTechnology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingScheme" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "implementingAgency" TEXT NOT NULL,
    "targetBeneficiary" TEXT NOT NULL,
    "supportType" TEXT NOT NULL,
    "financialDetails" TEXT NOT NULL,
    "sectorsCovered" TEXT NOT NULL,
    "eligibilityCriteria" TEXT NOT NULL,
    "requiredDocuments" TEXT,
    "minEnergySaving" DOUBLE PRECISION,
    "turnoverBrackets" TEXT,
    "applicableStates" TEXT,
    "status" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "applicationUrl" TEXT,
    "reportedImpact" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,

    CONSTRAINT "FundingScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechFundingLink" (
    "id" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "fundingId" TEXT NOT NULL,
    "subsidyPct" DOUBLE PRECISION,
    "maxAmountLakhs" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "TechFundingLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_udyamNumber_key" ON "Organisation"("udyamNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmissionFactor_fuelOrActivity_scope_scopeCategory_key" ON "EmissionFactor"("fuelOrActivity", "scope", "scopeCategory");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatedEmission_activityDataId_key" ON "CalculatedEmission"("activityDataId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelProperty_code_key" ON "FuelProperty"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GwpValue_gas_assessmentReport_key" ON "GwpValue"("gas", "assessmentReport");

-- CreateIndex
CREATE UNIQUE INDEX "UnitConversion_fromUnit_toUnit_fuelCode_key" ON "UnitConversion"("fromUnit", "toUnit", "fuelCode");

-- CreateIndex
CREATE UNIQUE INDEX "SectorBenchmark_sector_subSector_metric_key" ON "SectorBenchmark"("sector", "subSector", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "ReductionTechnology_techId_key" ON "ReductionTechnology"("techId");

-- CreateIndex
CREATE UNIQUE INDEX "FundingScheme_schemeId_key" ON "FundingScheme"("schemeId");

-- CreateIndex
CREATE UNIQUE INDEX "TechFundingLink_techId_fundingId_key" ON "TechFundingLink"("techId", "fundingId");

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingPeriod" ADD CONSTRAINT "ReportingPeriod_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityData" ADD CONSTRAINT "ActivityData_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityData" ADD CONSTRAINT "ActivityData_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculatedEmission" ADD CONSTRAINT "CalculatedEmission_activityDataId_fkey" FOREIGN KEY ("activityDataId") REFERENCES "ActivityData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculatedEmission" ADD CONSTRAINT "CalculatedEmission_efId_fkey" FOREIGN KEY ("efId") REFERENCES "EmissionFactor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculatedEmission" ADD CONSTRAINT "CalculatedEmission_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechFundingLink" ADD CONSTRAINT "TechFundingLink_techId_fkey" FOREIGN KEY ("techId") REFERENCES "ReductionTechnology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechFundingLink" ADD CONSTRAINT "TechFundingLink_fundingId_fkey" FOREIGN KEY ("fundingId") REFERENCES "FundingScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
