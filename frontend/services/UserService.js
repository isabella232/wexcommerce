import axios from 'axios';
import Env from '../config/env.config';
import { hasCookie, getCookie, setCookie, deleteCookie } from 'cookies-next';

const MAX_AGE = 100 * 365 * 24 * 60 * 60;

export default class UserService {

    static authHeader(context) {
        let user;
        const _context = context ? { req: context.req, res: context.res } : {};
        if (hasCookie('sc-fe-user', _context)) user = JSON.parse(getCookie('sc-fe-user', _context));

        if (user && user.accessToken) {
            return { 'x-access-token': user.accessToken };
        } else {
            return {};
        }
    }

    static signup(data) {
        return axios.post(`${Env.API_HOST}/api/sign-up/ `, data).then(res => res.status);
    }

    static validateEmail(data) {
        return axios.post(`${Env.API_HOST}/api/validate-email`, data).then(res => res.status);
    }

    static isUser(data) {
        return axios.post(`${Env.API_HOST}/api/is-user`, data).then(res => res.status);
    }

    static signin(data) {
        return axios.post(`${Env.API_HOST}/api/sign-in/${Env.APP_TYPE}`, data).then(res => {
            if (res.data.accessToken) {
                setCookie('sc-fe-user', JSON.stringify(res.data), { maxAge: MAX_AGE });
            }
            return { status: res.status, data: res.data };
        });
    }

    static signout(redirect = true, redirectSignIn = false) {
        deleteCookie('sc-fe-user');

        if (redirect) {
            window.location.href = '/';
        }

        if (redirectSignIn) {
            window.location.href = '/sign-in';
        }
    }

    static validateAccessToken(context) {
        return axios.post(`${Env.API_HOST}/api/validate-access-token`, null, { headers: UserService.authHeader(context) }).then(res => res.status);
    }

    static resendLink(data) {
        return axios.post(`${Env.API_HOST}/api/resend-link`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static resend(email, reset = false) {
        return axios.post(`${Env.API_HOST}/api/resend/${Env.APP_TYPE}/${encodeURIComponent(email)}/${reset}`).then(res => res.status);
    }

    static activate(data) {
        return axios.post(`${Env.API_HOST}/api/activate/ `, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static checkToken(userId, email, token) {
        return axios.get(`${Env.API_HOST}/api/check-token/${Env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`).then(res => res.status);
    }

    static deleteTokens(userId) {
        return axios.delete(`${Env.API_HOST}/api/delete-tokens/${encodeURIComponent(userId)}`).then(res => res.status);
    }

    static getLanguage(context) {
        let user;
        const _context = context ? { req: context.req, res: context.res } : {};
        if (hasCookie('sc-fe-user', _context)) user = JSON.parse(getCookie('sc-fe-user', _context));

        if (user && user.language) {
            return user.language;
        } else {
            let lang;
            if (hasCookie('sc-fe-language', _context)) lang = JSON.parse(getCookie('sc-fe-language', _context));

            if (lang && lang.length === 2) {
                return lang;
            }
            return Env.DEFAULT_LANGUAGE;
        }
    };

    static updateLanguage(data) {
        return axios.post(`${Env.API_HOST}/api/update-language`, data, { headers: UserService.authHeader() }).then(res => {
            if (res.status === 200) {
                let user;
                if (hasCookie('sc-fe-user')) user = JSON.parse(getCookie('sc-fe-user'));
                if (user) {
                    user.language = data.language;
                    setCookie('sc-fe-user', JSON.stringify(user), { maxAge: MAX_AGE });
                }
            }
            return res.status;
        })
    }

    static setLanguage(lang) {
        setCookie('sc-fe-language', JSON.stringify(lang), { maxAge: MAX_AGE });
    }

    static getCurrentUser(context) {
        let user;
        const _context = context ? { req: context.req, res: context.res } : {};
        if (hasCookie('sc-fe-user', _context)) user = JSON.parse(getCookie('sc-fe-user', _context));

        if (user && user.accessToken) {
            return user;
        }
        return null;
    };

    static getUser(context, id) {
        return axios.get(`${Env.API_HOST}/api/user/` + encodeURIComponent(id), { headers: UserService.authHeader(context) }).then(res => res.data);
    }

    static getUsers(context, payload, keyword, page, size) {
        return axios.post(`${Env.API_HOST}/api/users/${page}/${size}/?s=${encodeURIComponent(keyword)}`, payload, { headers: UserService.authHeader(context) }).then(res => res.data);
    }

    static updateUser(data) {
        return axios.post(`${Env.API_HOST}/api/update-user`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static checkPassword(id, pass) {
        return axios.get(`${Env.API_HOST}/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static changePassword(data) {
        return axios.post(`${Env.API_HOST}/api/change-password/ `, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static delete(ids) {
        return axios.post(`${Env.API_HOST}/api/delete-users`, ids, { headers: UserService.authHeader() }).then(res => res.status);
    }
}