import { ServerResponse } from 'http';
import logErrorInSentry, { logWarningInSentry } from '../sentry';

export const redirect = (res: ServerResponse, path: string) => {
  res.writeHead(302, {
    Location: path,
  });
  res.end();
};

export const redirectPageNotFound = (res: ServerResponse, msg: string) => {
  redirect(res, '/404');
  logWarningInSentry('Unknown url (404)', { details: msg });
};

export const redirectServerError = (res: ServerResponse, msg: string) => {
  redirect(res, '/500');
  logErrorInSentry(new Error('Server Error (500)'), { details: msg });
};

/**
 * Siren/Siret is NOT valid
 */
export const redirectSirenInvalid = (res: ServerResponse, siren: string) => {
  redirect(res, `/invalide/siren?q=${siren}`);
  logWarningInSentry('Siren is invalid', { siren });
};

export const redirectSiretInvalid = (res: ServerResponse, siret: string) => {
  redirect(res, `/invalide/siret?q=${siret}`);
  logWarningInSentry('Siret is invalid', { siret });
};

/**
 * Siren/Siret is valid but not found
 */
export const redirectSirenIntrouvable = (
  res: ServerResponse,
  siren: string
) => {
  redirect(res, `/introuvable/siren?q=${siren}`);
  logWarningInSentry('Siren not found', { siren });
};

export const redirectSiretIntrouvable = (
  res: ServerResponse,
  siret: string
) => {
  redirect(res, `/introuvable/siret?q=${siret}`);
  logWarningInSentry('Siret not found', { siret });
};

export default redirect;
