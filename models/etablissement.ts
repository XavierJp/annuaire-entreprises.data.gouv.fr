import {
  IEtablissement,
  IEtablissementWithUniteLegale,
  SiretNotFoundError,
  createDefaultEtablissement,
  NotASiretError,
  NotLuhnValidSiretError,
} from '.';
import { HttpNotFound } from '../clients/exceptions';
import { InseeForbiddenError } from '../clients/sirene-insee';
import {
  getEtablissementInsee,
  getEtablissementInseeWithFallbackCredentials,
} from '../clients/sirene-insee/siret';
import { getEtablissementSireneOuverte } from '../clients/sirene-ouverte/siret';
import {
  extractSirenFromSiret,
  hasSiretFormat,
  isSiret,
  Siret,
} from '../utils/helpers/siren-and-siret';
import { getUniteLegaleFromSlug } from './unite-legale';
import {
  logFirstSireneInseefailed,
  logSecondSireneInseefailed,
  logSireneOuvertefailed,
} from '../utils/sentry/helpers';

/*
 * Return an etablissement given an existing siret
 */
const getEtablissementFromSlug = async (
  slug: string
): Promise<IEtablissement> => {
  const siret = verifySiret(slug);
  return getEtablissement(siret);
};

/**
 * Throw an exception if a string is not a siret
 * */
const verifySiret = (slug: string): Siret => {
  if (!isSiret(slug)) {
    if (!hasSiretFormat(slug)) {
      throw new NotASiretError(slug);
    } else {
      throw new NotLuhnValidSiretError(slug);
    }
  }
  return slug;
};

/**
 * Return an Etablissement for a given siret
 */
const getEtablissement = async (siret: Siret): Promise<IEtablissement> => {
  try {
    return await getEtablissementInsee(siret);
  } catch (e) {
    if (e instanceof InseeForbiddenError) {
      return createNonDiffusibleEtablissement(siret);
    }
    if (e instanceof HttpNotFound) {
      throw new SiretNotFoundError(`Siret ${siret} was not found`);
    }

    logFirstSireneInseefailed({ siret, details: e.message });

    try {
      return await getEtablissementSireneOuverte(siret);
    } catch (e) {
      logSireneOuvertefailed({ siret, details: e.message });

      try {
        return await getEtablissementInseeWithFallbackCredentials(siret);
      } catch (e) {
        if (e instanceof InseeForbiddenError) {
          return createNonDiffusibleEtablissement(siret);
        }
        logSecondSireneInseefailed({ siret, details: e.message });

        // Siret was not found in both API, return a 404
        const message = `Siret ${siret} was not found in both siren API`;
        throw new SiretNotFoundError(message);
      }
    }
  }
};

/**
 * Return an Etablissement and the corresponding UniteLegale
 */
const getEtablissementWithUniteLegaleFromSlug = async (
  slug: string
): Promise<IEtablissementWithUniteLegale> => {
  const etablissement = await getEtablissementFromSlug(slug);
  const uniteLegale = await getUniteLegaleFromSlug(etablissement.siren);

  return { etablissement, uniteLegale };
};

/**
 * Download Etablissement and the Latitude/longitude
 */
const getEtablissementWithLatLongFromSlug = async (
  slug: string
): Promise<IEtablissement> => {
  try {
    return await getEtablissementSireneOuverte(slug);
  } catch (e) {
    throw new SiretNotFoundError(slug);
  }
};

//=========================
//        API calls
//=========================

/**
 * Create a default etablissement that will be displayed as non diffusible
 */
const createNonDiffusibleEtablissement = (siret: Siret) => {
  const etablissement = createDefaultEtablissement();
  etablissement.siret = siret;
  etablissement.siren = extractSirenFromSiret(siret);

  return etablissement;
};

export {
  getEtablissementWithUniteLegaleFromSlug,
  getEtablissementWithLatLongFromSlug,
  getEtablissementFromSlug,
};
