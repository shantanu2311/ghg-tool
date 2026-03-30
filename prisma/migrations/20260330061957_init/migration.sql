-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "gridRegion" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Facility_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportingPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "baseYearFlag" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportingPeriod_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "scope" INTEGER NOT NULL,
    "sourceCategory" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "description" TEXT,
    "inputMode" TEXT NOT NULL,
    "quantity" REAL,
    "unit" TEXT,
    "spendInr" REAL,
    "dataQualityFlag" TEXT NOT NULL DEFAULT 'SECONDARY',
    "month" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityData_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityData_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmissionFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fuelOrActivity" TEXT NOT NULL,
    "scope" INTEGER NOT NULL,
    "scopeCategory" TEXT,
    "co2Ef" REAL NOT NULL,
    "ch4Ef" REAL,
    "n2oEf" REAL,
    "efUnit" TEXT NOT NULL,
    "region" TEXT,
    "source" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "sourceUrl" TEXT,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "CalculatedEmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityDataId" TEXT NOT NULL,
    "efId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "co2Tonnes" REAL NOT NULL,
    "ch4Co2eTonnes" REAL NOT NULL,
    "n2oCo2eTonnes" REAL NOT NULL,
    "totalCo2eTonnes" REAL NOT NULL,
    "calculationMethod" TEXT NOT NULL,
    "calculationSteps" TEXT,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalculatedEmission_activityDataId_fkey" FOREIGN KEY ("activityDataId") REFERENCES "ActivityData" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalculatedEmission_efId_fkey" FOREIGN KEY ("efId") REFERENCES "EmissionFactor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CalculatedEmission_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "scope1Total" REAL NOT NULL,
    "scope2Total" REAL NOT NULL,
    "scope3Total" REAL NOT NULL,
    "scope3ByCategory" TEXT,
    "energyConsumedGj" REAL NOT NULL,
    "renewablePercent" REAL,
    "intensityPerTurnover" REAL,
    "intensityPerProduct" REAL,
    "intensityPerEmployee" REAL,
    "dataQualityScore" REAL NOT NULL,
    "reportFormat" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FuelProperty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "density" REAL,
    "ncvTjPerGg" REAL,
    "co2EfKgPerTj" REAL,
    "defaultPriceInr" REAL,
    "alternateUnits" TEXT,
    "commonMsmeUse" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "GwpValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gas" TEXT NOT NULL,
    "gwp" REAL NOT NULL,
    "assessmentReport" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceUrl" TEXT
);

-- CreateTable
CREATE TABLE "UnitConversion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUnit" TEXT NOT NULL,
    "toUnit" TEXT NOT NULL,
    "factor" REAL NOT NULL,
    "fuelCode" TEXT,
    "source" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "SectorBenchmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sector" TEXT NOT NULL,
    "subSector" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "bestPractice" REAL NOT NULL,
    "sectorAverage" REAL NOT NULL,
    "worstQuartile" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "year" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_udyamNumber_key" ON "Organisation"("udyamNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatedEmission_activityDataId_key" ON "CalculatedEmission"("activityDataId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelProperty_code_key" ON "FuelProperty"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GwpValue_gas_assessmentReport_key" ON "GwpValue"("gas", "assessmentReport");

-- CreateIndex
CREATE UNIQUE INDEX "UnitConversion_fromUnit_toUnit_fuelCode_key" ON "UnitConversion"("fromUnit", "toUnit", "fuelCode");
