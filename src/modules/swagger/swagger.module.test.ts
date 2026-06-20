import { SwaggerModule } from './swagger.module';
import type { Application } from 'express';

const mockSwaggerController = {
  registerRoutes: jest.fn(),
};

jest.mock('./controllers', () => ({
  SwaggerController: jest.fn().mockImplementation(() => mockSwaggerController),
}));

const mockApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
} as unknown as Application;

describe('SwaggerModule', () => {
  it('should create instance and initialize swagger middleware', async () => {
    const instance = new SwaggerModule(mockApp);
    await instance.init();

    expect(instance).toBeInstanceOf(SwaggerModule);
    expect(mockSwaggerController.registerRoutes).toHaveBeenCalled();
  });
});
