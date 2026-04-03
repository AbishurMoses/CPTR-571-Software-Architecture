"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticateController = void 0;
const common_1 = require("@nestjs/common");
const authenticate_service_1 = require("./authenticate.service");
const authenticate_dto_1 = require("./dto/authenticate.dto");
let AuthenticateController = class AuthenticateController {
    authenticateService;
    constructor(authenticateService) {
        this.authenticateService = authenticateService;
    }
    authenticate(authenticateDto) {
        return this.authenticateService.authenticate(authenticateDto);
    }
};
exports.AuthenticateController = AuthenticateController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [authenticate_dto_1.AuthenticateDto]),
    __metadata("design:returntype", void 0)
], AuthenticateController.prototype, "authenticate", null);
exports.AuthenticateController = AuthenticateController = __decorate([
    (0, common_1.Controller)('authenticate'),
    __metadata("design:paramtypes", [authenticate_service_1.AuthenticateService])
], AuthenticateController);
//# sourceMappingURL=authenticate.controller.js.map