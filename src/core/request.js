// @ts-check

import defaultsDeep from 'lodash/defaultsDeep';
import Core from './core';
import CustomRoute from './custom-route';
import { sanitizeUrl } from '../utils/url';
import { isAllowedRequestType, parseRequestData } from '../utils/request';

class Request extends Core {
  constructor(config) {
    super(config);

    this.applyCallableRequestMethods();
  }

  /**
   * Apply allowed request methods to the class
   *
   * By default this adds: get(), post(), put(), patch(), head(), delete()
   */
  applyCallableRequestMethods() {
    this.config.allowedRequestTypes.forEach(requestType => {
      this[requestType] = (...urlParams) => this.buildRequest(requestType, urlParams);
    });
  }

  /**
   * Make the request
   *
   * @param {String} type The Request type
   * @param {String} url The url
   * @return {Promise}
   */
  request(type, url) {
    type = type.toLowerCase();

    if (!isAllowedRequestType(type, this.config)) {
      throw new Error('This request type is not allowed.');
    }

    this.beforeRequest(type, url);

    if (this.config.debug) {
      return this.debugger.fakeRequest(type, url);
    }

    return new Promise((resolve, reject) => {
      this.http[type].call(
        this,
        sanitizeUrl(url, this.config.trailingSlash),
        ...parseRequestData(type, this.requestData, this.config),
      )
        .then(response => {
          this.afterRequest(response);

          resolve(response);
        })
        .catch(error => {
          this.onError(error);

          reject(error);
        });
    });
  }

  /**
   * Build a request URL
   *
   * @param {String} type
   * @param {Array} urlParams
   * @return {Promise}
   */
  buildRequest(type, urlParams) {
    if (this.urlParams) {
      urlParams = this.urlParams.concat(urlParams);
      this.resetURLParams();
    }

    const url = Array.isArray(urlParams) ? this.makeUrl(...urlParams) : this.makeUrl(urlParams);

    return this.request(type, url);
  }

  /**
   * Custom Routes
   *
   * These can be defined and passed via the customRoutes config attribute.
   * This allows you to completely override Rapid's usual functionality
   * and use this more like a router.
   */

  /**
   * Make a request to a route via a given route name
   * The request type depends on the type of request defined in the route
   *
   * @param {String} name
   * @param {Object} routeParams
   * @param {Object} requestParams
   * @return {Promise}
   */
  route(name = '', routeParams = {}, requestParams = {}) {
    const route = this.getCustomRoute(name, routeParams);

    // if there are request params, set them
    if (Object.keys(requestParams).length !== 0) {
      this.withParams(requestParams);
    }

    return this.request(route.type, route.url);
  }

  /**
   * Get a CustomRoute via given name
   *
   * @param {String} name
   * @param {Object} routeParams
   * @return {CustomRoute}
   */
  getCustomRoute(name = '', routeParams = {}) {
    // if a route exists, return a new instance of CustomRoute
    if (Object.prototype.hasOwnProperty.call(this.customRoutes, name)) {
      return new CustomRoute(this.customRoutes[name], {
        routeParams,
      });
    }

    // to prevent having undefined
    return new CustomRoute();
  }

  /**
   * Generate a url to a custom defined route
   * This applies the baseURL and the trailing slash config
   * as well
   *
   * @param {String} name
   * @param {Object} routeParams
   * @return {String}
   */
  generate(name = '', routeParams = {}) {
    const { url } = this.getCustomRoute(name, routeParams);

    return url !== '' ? this.makeUrl(this.config.baseURL, url) : '';
  }

  /**
   * Before, after, and error
   */

  /**
   * This is fired before the request
   * @param {String} type
   * @param {String} url
   * @return {Function}
   */
  beforeRequest(type, url) {
    return this.config.beforeRequest(type, url);
  }

  /**
   * This is fired after each request
   * @param {Object} response
   */
  afterRequest(response) {
    this.resetRequestData();
    this.resetURLParams();
    this.config.afterRequest(response);
  }

  /**
   * This is fired on a request error
   * @param {Object} error
   */
  onError(error) {
    this.resetRequestData();
    this.resetURLParams();
    this.config.onError(error);
  }

  /**
   * Params and Options
   */

  /**
   * Send data and options with the request
   *
   * @param {Object} data An object of params: {}, options: {}
   * @return {this}
   */
  withData(data = {}) {
    this.requestData = defaultsDeep(data, this.requestData);

    return this;
  }

  /**
   * Send params with the request
   *
   * @param {Object} params An object of params
   * @return {this}
   */
  withParams(params = {}) {
    this.requestData.params = params;

    return this;
  }

  /**
   * Send a single param with the request
   *
   * @param {Number|String} key The key name
   * @param {Number|String} value The value
   * @return {this}
   */
  withParam(key, value) {
    this.requestData.params[key] = value;

    return this;
  }

  /**
   * Send options with the request
   *
   * @param {Object} options An object of options
   * @return {this}
   */
  withOptions(options = {}) {
    this.requestData.options = options;

    return this;
  }

  /**
   * Send a single option with the request
   *
   * @param {Number|String} key The key name
   * @param {Number|String} value The value
   * @return {this}
   */
  withOption(key, value) {
    this.requestData.options[key] = value;

    return this;
  }
}

export default Request;
