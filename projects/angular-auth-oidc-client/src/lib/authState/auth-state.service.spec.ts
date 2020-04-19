import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ConfigurationProvider } from '../config/config.provider';
import { EventsService, EventTypes } from '../events';
import { LoggerService } from '../logging/logger.service';
import { LoggerServiceMock } from '../logging/logger.service-mock';
import { StoragePersistanceService } from '../storage/storage-persistance.service';
import { StoragePersistanceServiceMock } from '../storage/storage-persistance.service-mock';
import { PlatformProvider } from '../utils/platform-provider/platform.provider';
import { PlatformProviderMock } from '../utils/platform-provider/platform.provider-mock';
import { TokenValidationService } from '../validation/token-validation.service';
import { TokenValidationServiceMock } from '../validation/token-validation.service-mock';
import { AuthStateService } from './auth-state.service';
import { AuthorizedState } from './authorized-state';

describe('Auth State Service', () => {
    let authStateService: AuthStateService;
    let storagePersistanceService: StoragePersistanceService;
    let eventsService: EventsService;
    let tokenValidationService: TokenValidationService;
    let configurationProvider: ConfigurationProvider;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ConfigurationProvider,
                AuthStateService,
                EventsService,
                { provide: LoggerService, useClass: LoggerServiceMock },
                { provide: TokenValidationService, useClass: TokenValidationServiceMock },
                { provide: PlatformProvider, useClass: PlatformProviderMock },
                {
                    provide: StoragePersistanceService,
                    useClass: StoragePersistanceServiceMock,
                },
            ],
        });
    });

    beforeEach(() => {
        authStateService = TestBed.inject(AuthStateService);
        storagePersistanceService = TestBed.inject(StoragePersistanceService);
        eventsService = TestBed.inject(EventsService);
        tokenValidationService = TestBed.inject(TokenValidationService);
        configurationProvider = TestBed.inject(ConfigurationProvider);
    });

    it('should create', () => {
        expect(authStateService).toBeTruthy();
    });

    it('public authorize$ is observable$', () => {
        expect(authStateService.authorized$).toEqual(jasmine.any(Observable));
    });

    describe('setAuthorizedAndFireEvent', () => {
        it('sets the authstate to AuthorizedState.Authorized', () => {
            authStateService.setAuthorizedAndFireEvent();
            expect((authStateService as any).authState).toBe(AuthorizedState.Authorized);
        });

        it('persist AuthState In Storage', () => {
            const spy = spyOnProperty(storagePersistanceService, 'authorizedState', 'set');
            authStateService.setAuthorizedAndFireEvent();
            expect(spy).toHaveBeenCalledWith(AuthorizedState.Authorized);
        });

        it('throws event when state is being set to `true`', () => {
            const spy = spyOn((authStateService as any).authorizedInternal$, 'next');
            authStateService.setAuthorizedAndFireEvent();
            expect(spy).toHaveBeenCalledWith(true);
        });
    });

    describe('setUnauthorizedAndFireEvent', () => {
        it('sets the authstate to AuthorizedState.Unauthorized', () => {
            authStateService.setUnauthorizedAndFireEvent();
            expect((authStateService as any).authState).toBe(AuthorizedState.Unauthorized);
        });

        it('persist AuthState In Storage', () => {
            const spy = spyOn(storagePersistanceService, 'resetAuthStateInStorage');
            authStateService.setUnauthorizedAndFireEvent();
            expect(spy).toHaveBeenCalled();
        });

        it('throws event when state is being set to `false`', () => {
            const spy = spyOn((authStateService as any).authorizedInternal$, 'next');
            authStateService.setUnauthorizedAndFireEvent();
            expect(spy).toHaveBeenCalledWith(false);
        });
    });

    describe('initStateFromStorage', () => {
        it('authState is set to AuthorizedState.Authorized when persisted state is AuthorizedState.Authorized', () => {
            spyOnProperty(storagePersistanceService, 'authorizedState', 'get').and.returnValue(AuthorizedState.Authorized);
            authStateService.initStateFromStorage();
            expect((authStateService as any).authState).toBe(AuthorizedState.Authorized);
        });

        it('authState is set to AuthorizedState.Unknown when persisted state is AuthorizedState.Unknown', () => {
            spyOnProperty(storagePersistanceService, 'authorizedState', 'get').and.returnValue(AuthorizedState.Unknown);
            authStateService.initStateFromStorage();
            expect((authStateService as any).authState).toBe(AuthorizedState.Unknown);
        });

        it('authState is set to AuthorizedState.Unknown when persisted state is AuthorizedState.Unauthorized', () => {
            spyOnProperty(storagePersistanceService, 'authorizedState', 'get').and.returnValue(AuthorizedState.Unauthorized);
            authStateService.initStateFromStorage();
            expect((authStateService as any).authState).toBe(AuthorizedState.Unknown);
        });
    });

    describe('updateAndPublishAuthState', () => {
        it('calls eventsService', () => {
            spyOn(eventsService, 'fireEvent');
            authStateService.updateAndPublishAuthState({ authorizationState: null, isRenewProcess: false, validationResult: null });
            expect(eventsService.fireEvent).toHaveBeenCalledWith(EventTypes.NewAuthorizationResult, jasmine.any(Object));
        });
    });

    describe('setAuthorizationData', () => {
        it('stores accessToken', () => {
            const spy = spyOnProperty(storagePersistanceService, 'accessToken', 'set');
            authStateService.setAuthorizationData('accesstoken', 'not used');
            expect(spy).toHaveBeenCalledWith('accesstoken');
        });

        it('stores accessToken', () => {
            const spy = spyOnProperty(storagePersistanceService, 'idToken', 'set');
            authStateService.setAuthorizationData('not used', 'idtoken');
            expect(spy).toHaveBeenCalledWith('idtoken');
        });

        it('calls setAuthorizedAndFireEvent() method', () => {
            const spy = spyOn(authStateService, 'setAuthorizedAndFireEvent');
            authStateService.setAuthorizationData('not used', 'idtoken');
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('getAccessToken', () => {
        it('authState is Unknown returns empty string', () => {
            (authStateService as any).authState = AuthorizedState.Unknown;
            const result = authStateService.getAccessToken();
            expect(result).toBe('');
        });

        it('authState is Unauthorized returns empty string', () => {
            (authStateService as any).authState = AuthorizedState.Unauthorized;
            const result = authStateService.getAccessToken();
            expect(result).toBe('');
        });

        it('authState is Authorized returns decodeURIComponent(token)', () => {
            (authStateService as any).authState = AuthorizedState.Authorized;
            spyOn(storagePersistanceService, 'getAccessToken').and.returnValue('HenloLegger');
            const result = authStateService.getAccessToken();
            expect(result).toBe(decodeURIComponent('HenloLegger'));
        });
    });

    describe('getIdToken', () => {
        it('authState is Unknown returns empty string', () => {
            (authStateService as any).authState = AuthorizedState.Unknown;
            const result = authStateService.getIdToken();
            expect(result).toBe('');
        });

        it('authState is Unauthorized returns empty string', () => {
            (authStateService as any).authState = AuthorizedState.Unauthorized;
            const result = authStateService.getIdToken();
            expect(result).toBe('');
        });

        it('authState is Authorized returns decodeURIComponent(token)', () => {
            (authStateService as any).authState = AuthorizedState.Authorized;
            spyOn(storagePersistanceService, 'getIdToken').and.returnValue('HenloLegger');
            const result = authStateService.getIdToken();
            expect(result).toBe(decodeURIComponent('HenloLegger'));
        });
    });

    describe('getRefreshToken', () => {
        it('authState is Unknown returns empty string', () => {
            (authStateService as any).authState = AuthorizedState.Unknown;
            const result = authStateService.getRefreshToken();
            expect(result).toBe('');
        });

        it('authState is Unauthorized returns empty string', () => {
            (authStateService as any).authState = AuthorizedState.Unauthorized;
            const result = authStateService.getRefreshToken();
            expect(result).toBe('');
        });

        it('authState is Authorized returns decodeURIComponent(token)', () => {
            (authStateService as any).authState = AuthorizedState.Authorized;
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue('HenloLegger');
            const result = authStateService.getRefreshToken();
            expect(result).toBe(decodeURIComponent('HenloLegger'));
        });
    });

    describe('isAuthStorageTokenValid', () => {
        it('authState is AuthorizedState.Unknown returns false', () => {
            spyOnProperty(storagePersistanceService, 'authorizedState', 'get').and.returnValue(AuthorizedState.Unknown);
            const result = authStateService.isAuthStorageTokenValid();
            expect(result).toBeFalse();
        });

        it('authState is AuthorizedState.Unauthorized returns false', () => {
            spyOnProperty(storagePersistanceService, 'authorizedState', 'get').and.returnValue(AuthorizedState.Unauthorized);
            const result = authStateService.isAuthStorageTokenValid();
            expect(result).toBeFalse();
        });

        it('authState is AuthorizedState.Authorized and token is expired returns false', () => {
            spyOnProperty(storagePersistanceService, 'authorizedState', 'get').and.returnValue(AuthorizedState.Authorized);
            spyOn(authStateService as any, 'tokenIsExpired').and.returnValue(true);
            const result = authStateService.isAuthStorageTokenValid();
            expect(result).toBeFalse();
        });

        it('authState is AuthorizedState.Authorized and token is not expired returns true', () => {
            spyOnProperty(storagePersistanceService, 'authorizedState', 'get').and.returnValue(AuthorizedState.Authorized);
            spyOn(authStateService as any, 'tokenIsExpired').and.returnValue(false);
            const result = authStateService.isAuthStorageTokenValid();
            expect(result).toBeTrue();
        });

        it('authState is AuthorizedState.Authorized and token is not expired fires event', () => {
            spyOnProperty(storagePersistanceService, 'authorizedState', 'get').and.returnValue(AuthorizedState.Authorized);
            spyOn(authStateService as any, 'tokenIsExpired').and.returnValue(false);
            const eventSpy = spyOn(authStateService, 'setAuthorizedAndFireEvent');
            const result = authStateService.isAuthStorageTokenValid();
            expect(result).toBeTrue();
            expect(eventSpy).toHaveBeenCalled();
        });
    });

    describe('setAuthResultInStorage', () => {
        it('sets authresult', () => {
            const spy = spyOnProperty(storagePersistanceService, 'authResult', 'set');
            authStateService.setAuthResultInStorage('HENLO FURIEND');
            expect(spy).toHaveBeenCalledWith('HENLO FURIEND');
        });
    });

    describe('tokenIsExpired', () => {
        it('tokenValidationService gets called with id token if idtoken is set', () => {
            const serviceAsAny = authStateService as any;
            configurationProvider.setConfig({ silentRenewOffsetInSeconds: 30 }, null);
            const spy = spyOn(tokenValidationService, 'isTokenExpired').and.callFake((a, b) => true);
            spyOnProperty(storagePersistanceService, 'idToken', 'get').and.returnValue('idToken');
            serviceAsAny.tokenIsExpired();
            expect(spy).toHaveBeenCalledWith('idToken', 30);
        });

        it('tokenValidationService gets called with accessToken if idtoken is not set', () => {
            const serviceAsAny = authStateService as any;
            configurationProvider.setConfig({ silentRenewOffsetInSeconds: 30 }, null);
            const spy = spyOn(tokenValidationService, 'isTokenExpired').and.callFake((a, b) => true);
            spyOnProperty(storagePersistanceService, 'idToken', 'get').and.returnValue(null);
            spyOnProperty(storagePersistanceService, 'accessToken', 'get').and.returnValue('accessToken');
            serviceAsAny.tokenIsExpired();
            expect(spy).toHaveBeenCalledWith('accessToken', 30);
        });
    });
});
