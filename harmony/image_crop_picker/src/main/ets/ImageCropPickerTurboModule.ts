import type { TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { TM } from "@rnoh/react-native-openharmony/generated/ts"
import { TurboModule } from '@rnoh/react-native-openharmony/ts'
import Logger from './Logger';
import type Want from '@ohos.app.ability.Want';
import image from '@ohos.multimedia.image';
import media from '@ohos.multimedia.media';
import util from '@ohos.util';
import uri from '@ohos.uri';
import picker from '@ohos.multimedia.cameraPicker';
import photoAccessHelper from '@ohos.file.photoAccessHelper';
import camera from '@ohos.multimedia.camera';
import { BusinessError } from '@ohos.base';
import fs, { Filter } from '@ohos.file.fs';
import { JSON } from '@kit.ArkTS';
import abilityAccessCtrl, { Permissions } from '@ohos.abilityAccessCtrl';
import { PermissionRequestResult } from '@ohos.abilityAccessCtrl';

import { window } from '@kit.ArkUI';


export type MediaType = 'photo' | 'video' | 'any';

export type OrderType = 'asc' | 'desc' | 'none';

export type ErrorCode = 'camera_unavailable' | 'permission' | 'others';

const MaxNumber = 5;
const MinNumber = 1;
const ImageQuality = 1;
const TAG: string = 'ImageCropPickerTurboModule';
const WANT_PARAM_URI_SELECT_SINGLE: string = 'singleselect';
const WANT_PARAM_URI_SELECT_MULTIPLE: string = 'multipleselect';
const ENTER_GALLERY_ACTION: string = "ohos.want.action.photoPicker";
const filePrefix = 'file://'
const atManager = abilityAccessCtrl.createAtManager();
const MINIMUM_VALUE = 1;

let avMetadataExtractor: media.AVMetadataExtractor;

export type SmartAlbums = | 'Regular' | 'SyncedEvent' | 'SyncedFaces';

export type CompressVideoPresets = | 'LowQuality' | 'MediumQuality' | 'HighestQuality' | 'Passthrough';

export type CropperOptions = ImageOptions & {
  path: string;
}

export type Options = AnyOptions | VideoOptions | ImageOptions;

export type AnyOptions = Omit<ImageOptions, 'mediaType'> & Omit<VideoOptions, 'mediaType'> & {
  mediaType?: 'any';
};

export type VideoOptions = CommonOptions & {
  mediaType: 'video';
  compressVideoPreset?: CompressVideoPresets;
};

export type ImageOptions = CommonOptions & {
  mediaType: MediaType;
  width?: number;
  height?: number;
  includeBase64?: boolean;
  includeExif?: boolean;
  forceJpg?: boolean;
  cropping?: boolean;
  avoidEmptySpaceAroundImage?: boolean;
  cropperActiveWidgetColor?: string;
  cropperStatusBarColor?: string;
  cropperToolbarColor?: string;
  cropperToolbarWidgetColor?: string;
  cropperToolbarTitle?: string;
  freeStyleCropEnabled?: boolean;
  cropperTintColor?: string;
  cropperCircleOverlay?: boolean;
  cropperCancelText?: string;
  cropperCancelColor?: string;
  cropperChooseText?: string;
  cropperChooseColor?: string;
  cropperRotateButtonsHidden?: boolean
  showCropGuidelines?: boolean;
  showCropFrame?: boolean;
  enableRotationGesture?: boolean;
  disableCropperColorSetters?: boolean;
  compressImageMaxWidth?: number;
  compressImageMaxHeight?: number;
  compressImageQuality?: number;
}

export interface CommonOptions {
  multiple?: boolean;
  minFiles?: number;
  maxFiles?: number;
  waitAnimationEnd?: boolean;
  smartAlbums?: SmartAlbums[];
  useFrontCamera?: boolean;
  loadingLabelText?: string;
  showsSelectedCount?: boolean;
  sortOrder?: 'none' | 'asc' | 'desc';
  hideBottomControls?: boolean;
  compressImageQuality?: number;
  mediaType: MediaType;
  width?: number;
  height?: number;
  includeBase64?: boolean;
  includeExif?: boolean;
  forceJpg?: boolean;
  cropping?: boolean;
  avoidEmptySpaceAroundImage?: boolean;
  cropperActiveWidgetColor?: string;
  cropperStatusBarColor?: string;
  cropperToolbarColor?: string;
  cropperToolbarWidgetColor?: string;
  cropperToolbarTitle?: string;
  freeStyleCropEnabled?: boolean;
  cropperTintColor?: string;
  cropperCircleOverlay?: boolean;
  cropperCancelText?: string;
  cropperCancelColor?: string;
  cropperChooseText?: string;
  cropperChooseColor?: string;
  cropperRotateButtonsHidden?: boolean
  showCropGuidelines?: boolean;
  showCropFrame?: boolean;
  enableRotationGesture?: boolean;
  disableCropperColorSetters?: boolean;
  compressImageMaxWidth?: number;
  compressImageMaxHeight?: number;
  writeTempFile?: boolean;
}

export interface Image extends ImageVideoCommon {
  data?: string | null;
  cropRect?: CropRect | null;
}

export interface Video extends ImageVideoCommon {
  duration: number | null;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageOrVideo {
  data?: string | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  cropRect?: CropRect | null;
  filename?: string | null;
  path?: string | null;
  exif?: Exif | null;
  mime?: string | null;
  sourceURL?: string | null;
  creationDate?: string | null;
  modificationDate?: string | null;
  localIdentifier?: string | null;
  duration?: string | null;
}

export interface ImageVideoCommon {
  path: string;
  size: number;
  width: number;
  height: number;
  mime: string;
  exif?: Exif;
  localIdentifier?: string;
  sourceURL?: string;
  filename?: string;
  creationDate?: string;
  modificationDate?: string;
}

export interface Exif {
  BitsPerSample?: string;
  Orientation?: string;
  ImageLength?: string;
  ImageWidth?: string;
  GPSLatitude?: string;
  GPSLongitude?: string;
  GPSLatitudeRef?: string;
  GPSLongitudeRef?: string;
  DateTimeOriginal?: string;
  ExposureTime?: string;
  SceneType?: string;
  ISOSpeedRatings?: string;
  FNumber?: string;
}

export class FilePath {
  path?: string;
}

export interface VideoImageInfo {
  data?: string | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  cropRect?: CropRect | null;
  filename?: string | null;
  path?: string | null;
  exif?: Exif | null;
  mime?: string | null;
  sourceURL?: string | null;
  creationDate?: number | null;
  modificationDate?: number | null;
  localIdentifier?: string | null;
  duration?: string | null;
}

export interface FilePathResult {
  result?: FilePath[];
}

export class AbilityResult {
  resultCode: number;
  want?: Want;
}

export class ImageCropPickerTurboModule extends TurboModule implements TM.ImageCropPicker.Spec {
  constructor(protected ctx: TurboModuleContext) {
    super(ctx);
  }

  isNullOrUndefined(value: any): boolean {
    return value === null || value === undefined || value === '';
  }

  async openPicker(options?: Options): Promise<Video[] | Video | ImageOrVideo[] | ImageOrVideo | Image[] | Image> {
    Logger.info(`${TAG} into openPicker request ${JSON.stringify(options)}`);
    let cropping = this.isNullOrUndefined(options?.cropping) ? false : options?.cropping;
    let minFiles = this.isNullOrUndefined(options?.minFiles) ? MinNumber : options.minFiles;
    let maxFiles = this.isNullOrUndefined(options?.maxFiles) ? MaxNumber : options.maxFiles;
    let isShowSerialNum = this.isNullOrUndefined(options?.showsSelectedCount) ? true : options?.showsSelectedCount;
    if (options.multiple && minFiles > maxFiles) {
      return new Promise(async (res, rej) => {
        rej('minFiles is error')
      })
    }
    let quality = options.compressImageQuality;
    if (!this.isNullOrUndefined(quality) && !(quality >= 0 && quality <= 1)) {
      return new Promise(async (res, rej) => {
        rej('quality is error')
      })
    }
    let multiple = this.isNullOrUndefined(options.multiple) ? false : options.multiple;
    let mediaType = options.mediaType == 'photo' ? photoAccessHelper.PhotoViewMIMETypes.IMAGE_TYPE
      : (options.mediaType == 'video' ? photoAccessHelper.PhotoViewMIMETypes.VIDEO_TYPE : photoAccessHelper.PhotoViewMIMETypes.IMAGE_VIDEO_TYPE);

    let writeTempFile = this.isNullOrUndefined(options.writeTempFile) ? true : options.writeTempFile;
    let qualityNumber = this.isNullOrUndefined(options.compressImageQuality) ? ImageQuality : options.compressImageQuality;
    let forceJpg = this.isNullOrUndefined(options.forceJpg) ? false : options.forceJpg;
    try {
      let photoSelectOptions = new photoAccessHelper.PhotoSelectOptions();
      photoSelectOptions.MIMEType = mediaType;
      photoSelectOptions.maxSelectNumber = multiple ? maxFiles : 1;
      photoSelectOptions.isSearchSupported = false;
      let photoPicker = new photoAccessHelper.PhotoViewPicker();
      let result: photoAccessHelper.PhotoSelectResult = await photoPicker.select(photoSelectOptions);
      let sourceFilePaths: Array<string> = result.photoUris as Array<string>;
      if (sourceFilePaths.length < MINIMUM_VALUE) {
        return new Promise(async (res, rej) => {
          rej('sourceFilePaths is empty')
        })
      }
      let tempFilePaths = null;
      Logger.info(`${TAG} into openPicker tempFilePaths ${JSON.stringify(sourceFilePaths)}`);
      if (qualityNumber !== 1 || forceJpg) {
        Logger.info(`${TAG} qualityNumber = ${qualityNumber} forceJpg = ${forceJpg}`);
        tempFilePaths = await this.compressPictures(qualityNumber * 100, forceJpg, sourceFilePaths);
      } else {
        tempFilePaths = writeTempFile ? this.getTempFilePaths(sourceFilePaths) : null;
      }

      let tempFilePath = null;
      const isImg = tempFilePaths ? this.isImage(tempFilePaths[0]) : false;
      if (!multiple && isImg && cropping) {
        const imgCropPath = await this.intoCropper(tempFilePaths[0], options);
        if (!this.isNullOrUndefined(imgCropPath)) {
          tempFilePath = imgCropPath;
          Logger.info(`${TAG} into openCamera imgCropPath = ${imgCropPath}`);
        }
        let exifInfo;
        if (options?.includeExif) {
          try {
            let exifFile = fs.openSync(tempFilePath, fs.OpenMode.READ_ONLY);
            let exifImageIS = image.createImageSource(exifFile.fd);
            exifInfo = await this.getImageExif(exifImageIS);
          } catch (err) {
            Logger.error(`${TAG} into getPickerResult err : ${JSON.stringify(err)}`);
          }
        }
        let imgResult: Image = {
          data: null,
          cropRect: null,
          path: null,
          size: 0,
          width: 0,
          height: 0,
          mime: '',
          exif: null,
          localIdentifier: '',
          sourceURL: '',
          filename: '',
          creationDate: null,
          modificationDate: null
        };
        await this.getFileInfo(options?.includeBase64, tempFilePath, null, exifInfo).then((imageInfo) => {
          imgResult.path = filePrefix + imgCropPath;
          imgResult.exif = imageInfo.exif;
          imgResult.data = imageInfo.data;
          imgResult.size = imageInfo.size;
          imgResult.width = imageInfo.width;
          imgResult.height = imageInfo.height;
          imgResult.filename = imageInfo.filename;
          imgResult.mime = imageInfo.mime;
          imgResult.localIdentifier = imageInfo.localIdentifier;
          imgResult.cropRect = imageInfo.cropRect;
          imgResult.creationDate = imageInfo.creationDate + '';
          imgResult.modificationDate = imageInfo.modificationDate + '';
        })
        return imgResult;
      }

      return this.getPickerResult(options, sourceFilePaths, tempFilePaths);
    } catch (error) {
      Logger.error(`${TAG} PhotoViewPicker failed err: ${JSON.stringify(error)}`);
      return new Promise(async (res, rej) => {
        rej('PhotoViewPicker is failed')
      })
    }
  }

  getTempFilePaths(images: Array<string>): Array<string> {
    let resultImages: Array<string> = new Array<string>();
    Logger.info(`${TAG} getTempFilePaths images = ${images}`);
    for (let srcPath of images) {
      Logger.info(`${TAG} getTempFilePaths img srcPath = ${srcPath}`);
      let i = srcPath.lastIndexOf('.');
      let imageType = '';
      if (i != -1) {
        imageType = srcPath.substring(i + 1);
        Logger.info(`${TAG} getTempFilePaths img imageType = ${imageType}`);
      }
      let file = fs.openSync(srcPath, fs.OpenMode.CREATE);
      let dstPath = this.ctx.uiAbilityContext.tempDir + '/rn_image_crop_picker_lib_temp_' + util.generateRandomUUID(true) + '.' + imageType;
      try {
        fs.copyFileSync(file.fd, dstPath, 0);
        resultImages.push(dstPath);
        Logger.info(`${TAG} getTempFilePaths suc dstPath = ${dstPath}`);
      } catch (err) {
        Logger.info(`${TAG}, getTempFilePaths fail err = ${JSON.stringify(err)}`);
      }
      fs.closeSync(file);
    }
    return resultImages;
  }

  async getPickerResult(options: Options, sourceFilePaths: Array<string>, tempFilePaths: Array<string>): Promise<ImageOrVideo[] | ImageOrVideo> {
    Logger.info(`${TAG}, into openPickerResult :`);
    let resultsList: ImageOrVideo[] = [];
    let includeExif = this.isNullOrUndefined(options?.includeExif) ? false : options?.includeExif;
    let images = this.isNullOrUndefined(tempFilePaths) ? sourceFilePaths : tempFilePaths;
    Logger.info(`${TAG} into openPickerResult : images = ${images}`);
    let includeBase64 = this.isNullOrUndefined(options.includeBase64) ? false : options.includeBase64;
    let results;
    for (let j = 0; j < images.length; j++) {
      results = {
        duration: null,
        data: null,
        cropRect: null,
        path: null,
        size: 0,
        width: 0,
        height: 0,
        mime: '',
        exif: null,
        localIdentifier: '',
        sourceURL: '',
        filename: '',
        creationDate: null,
        modificationDate: null
      };
      let value = images[j];
      if (this.isNullOrUndefined(value)) {
        return;
      }
      let imageType;
      let i = value.lastIndexOf('/')
      let fileName = value.substring(i + 1)
      i = value.lastIndexOf('.')
      if (i != -1) {
        imageType = value.substring(i + 1)
      }
      results.sourceURL = sourceFilePaths[j];
      results.filename = fileName;
      let exifInfo;
      // /\.(jpeg)$/i.test(sourceFilePaths[j])
      if (includeExif) {
        try {
          let exifFile = fs.openSync(sourceFilePaths[j], fs.OpenMode.READ_ONLY);
          let exifImageIS = image.createImageSource(exifFile.fd);
          exifInfo = await this.getImageExif(exifImageIS);
        } catch (err) {
          Logger.error(`${TAG} into getPickerResult err : ${JSON.stringify(err)}`);
        }
      }
      results.exif = exifInfo;
      let file = fs.openSync(value, fs.OpenMode.READ_ONLY)
      Logger.info(`${TAG} into openSync : file.fd = ${file.fd} file.path = ${file.path} file.name = ${file.name}`);
      let stat = fs.statSync(file.fd);
      let length = stat.size;
      results.size = length;
      results.creationDate = stat.ctime + '';
      results.modificationDate = stat.mtime + '';
      results.path = this.isNullOrUndefined(tempFilePaths) ? null : filePrefix + value;
      if (this.isImage(value)) {
        results.data = includeBase64 ? this.imageToBase64(value) : null;
        results.mime = 'image/' + imageType;
        Logger.info(`${TAG} into openPickerResult value : ${value}`);
        let imageIS = image.createImageSource(file.fd)
        let imagePM = await imageIS.createPixelMap()
        Logger.info(`${TAG} end createImageSource : imageIS = ${imageIS} imagePM = ${imagePM}`);
        let imgInfo = await imagePM.getImageInfo();
        results.height = imgInfo.size.height;
        results.width = imgInfo.size.width;
        imagePM.release().then(() => {
          imagePM = undefined;
        })
        imageIS.release().then(() => {
          imageIS = undefined;
        })
        results.duration = null;
      } else {
        Logger.info(`${TAG} into getPickerResult video start`);
        results.data = null;
        results.mime = 'video/' + imageType;
        let url = 'fd://' + file.fd;
        Logger.info(`${TAG} start avPlayer url = ${url}`);
        avMetadataExtractor = await media.createAVMetadataExtractor();
        avMetadataExtractor.fdSrc = { fd: file.fd, offset: 0, length: length };
        try {
          const res = await avMetadataExtractor.fetchMetadata();
          results.duration = res.duration;
          results.width = Number(res.videoWidth);
          results.height = Number(res.videoHeight);
        } catch (error) {
          Logger.error(`${TAG} get video info suc error = ${JSON.stringify(error)}`);
        }
      }
      resultsList.push(results);
      fs.closeSync(file);
    }
    return options.multiple ? resultsList : results;
  }

  async openCamera(options?: Options): Promise<Video[] | Video | ImageOrVideo[] | ImageOrVideo | Image[] | Image> {
    Logger.info(`${TAG} into openCamera request = ${JSON.stringify(options)}`);
    let cropping = this.isNullOrUndefined(options?.cropping) ? false : options?.cropping;
    let quality = options.compressImageQuality;
    if (!this.isNullOrUndefined(quality) && !(quality >= 0 && quality <= 1)) {
      return new Promise(async (res, rej) => {
        rej('quality is error')
      })
    }
    let isImg = false;
    let imgResult: Image = {
      data: null,
      cropRect: null,
      path: null,
      size: 0,
      width: 0,
      height: 0,
      mime: '',
      exif: null,
      localIdentifier: '',
      sourceURL: '',
      filename: '',
      creationDate: null,
      modificationDate: null
    };
    let videoResult: Video = {
      duration: null,
      path: null,
      size: 0,
      width: 0,
      height: 0,
      mime: '',
      exif: null,
      localIdentifier: '',
      sourceURL: '',
      filename: '',
      creationDate: null,
      modificationDate: null
    };
    let useFrontCamera = this.isNullOrUndefined(options.useFrontCamera) ? false : options.useFrontCamera;
    let writeTempFile = this.isNullOrUndefined(options?.writeTempFile) ? true : options?.writeTempFile;
    let includeBase64 = this.isNullOrUndefined(options.includeBase64) ? false : options.includeBase64;
    let qualityNumber = this.isNullOrUndefined(options.compressImageQuality) ? ImageQuality : options.compressImageQuality;
    let forceJpg = this.isNullOrUndefined(options.forceJpg) ? false : options.forceJpg;
    let mediaType = options.mediaType == 'photo' ? [picker.PickerMediaType.PHOTO] : (options.mediaType == 'video'
      ? [picker.PickerMediaType.VIDEO] : [picker.PickerMediaType.PHOTO, picker.PickerMediaType.VIDEO]);
    return new Promise(async (res, rej) => {
      try {
        let mContext = await this.ctx.uiAbilityContext;
        let pickerProfile: picker.PickerProfile = {
          cameraPosition: useFrontCamera ? camera.CameraPosition.CAMERA_POSITION_FRONT : camera.CameraPosition.CAMERA_POSITION_BACK,
        };
        let pickerResult: picker.PickerResult = await picker.pick(mContext, mediaType, pickerProfile);
        Logger.info(`${TAG} into openCamera results = ${JSON.stringify(pickerResult)}`);
        let imgOrVideoPath = pickerResult.resultUri;
        isImg = this.isImage(imgOrVideoPath);
        if (isImg) {
          let file = fs.openSync(imgOrVideoPath, fs.OpenMode.READ_ONLY);
          try {
            let dstPath = this.ctx.uiAbilityContext.tempDir + '/rn_image_crop_picker_lib_temp_' + util.generateRandomUUID(true) + '.jpeg';
            fs.copyFileSync(file.fd, dstPath, 0);
            imgOrVideoPath = dstPath;
            Logger.info(`${TAG} into openCamera suc dstPath = ${dstPath}`);
          } catch (err) {
            Logger.error(`${TAG} into openCamera fail err = ${JSON.stringify(err)}`);
          }
          fs.closeSync(file);
        }
        let tempFilePaths = null;
        let sourceFilePaths: Array<string> = [imgOrVideoPath];
        if (qualityNumber !== 1 || forceJpg) {
          Logger.info(`${TAG} into openCamera qualityNumber = ${qualityNumber} forceJpg = ${forceJpg}`);
          tempFilePaths = await this.compressPictures(qualityNumber * 100, forceJpg, sourceFilePaths);
        } else {
          tempFilePaths = writeTempFile ? this.getTempFilePaths(sourceFilePaths) : null;
        }
        let tempFilePath = this.isNullOrUndefined(tempFilePaths) ? null : tempFilePaths[0];
        let includeExif = this.isNullOrUndefined(options?.includeExif) ? false : options?.includeExif;
        if (isImg) {
          let exifInfo;
          // /\.(jpeg)$/i.test(imgOrVideoPath)
          if (includeExif) {
            try {
              let exifFile = fs.openSync(imgOrVideoPath, fs.OpenMode.READ_ONLY);
              let exifImageIS = image.createImageSource(exifFile.fd);
              exifInfo = await this.getImageExif(exifImageIS);
            } catch (err) {
              Logger.error(`${TAG} into openCamera err = ${JSON.stringify(err)}`);
            }
          }
          let imgCropPath = cropping ? await this.intoCropper(imgOrVideoPath, options) : '';
          if (!this.isNullOrUndefined(imgCropPath)) {
            tempFilePath = imgCropPath;
            Logger.info(`${TAG} into openCamera imgCropPath = ${imgCropPath}`);
          }
          this.getFileInfo(includeBase64, imgOrVideoPath, tempFilePath, exifInfo).then((imageInfo) => {
            imgResult.sourceURL = imgOrVideoPath;
            imgResult.path = this.isNullOrUndefined(tempFilePath) ? filePrefix + imgOrVideoPath : filePrefix + tempFilePath;
            imgResult.exif = imageInfo.exif;
            imgResult.data = imageInfo.data;
            imgResult.size = imageInfo.size;
            imgResult.width = imageInfo.width;
            imgResult.height = imageInfo.height;
            imgResult.filename = imageInfo.filename;
            imgResult.mime = imageInfo.mime;
            imgResult.localIdentifier = imageInfo.localIdentifier;
            imgResult.cropRect = imageInfo.cropRect;
            imgResult.creationDate = imageInfo.creationDate + '';
            imgResult.modificationDate = imageInfo.modificationDate + '';
            res(imgResult);
          })
        } else {
          this.getFileInfo(false, imgOrVideoPath, tempFilePath, null).then((imageInfo) => {
            videoResult.sourceURL = imgOrVideoPath;
            videoResult.path = this.isNullOrUndefined(tempFilePath) ? imgOrVideoPath : filePrefix + tempFilePath;
            videoResult.exif = imageInfo.exif;
            videoResult.size = imageInfo.size;
            videoResult.width = imageInfo.width;
            videoResult.height = imageInfo.height;
            videoResult.filename = imageInfo.filename;
            videoResult.mime = imageInfo.mime;
            videoResult.localIdentifier = imageInfo.localIdentifier;
            videoResult.creationDate = imageInfo.creationDate + '';
            videoResult.modificationDate = imageInfo.modificationDate + '';
            videoResult.duration = Number(imageInfo.duration);
            res(videoResult);
          })
        }
      } catch (error) {
        let err = error as BusinessError;
        rej(JSON.stringify(err));
      }
    })
  };

  imageToBase64(filePath: string): string {
    Logger.info(`${TAG} into imageToBase64 filePath = ${filePath}`);
    let uriPath = new uri.URI(filePath);
    let dstPath = filePath;
    if (uriPath.host === 'media') {
      let i = filePath.lastIndexOf('.');
      let imageType;
      if (i != -1) {
        imageType = filePath.substring(i + 1);
      }
      let file = fs.openSync(filePath, fs.OpenMode.CREATE);
      try {
        dstPath = this.ctx.uiAbilityContext.tempDir + '/rn_image_crop_picker_lib_temp_' + util.generateRandomUUID(true) + '.' + imageType;
        fs.copyFileSync(file.fd, dstPath, 0);
        Logger.info(`${TAG} into imageToBase64 suc dstPath = ${dstPath}`);
      } catch (err) {
        Logger.error(`${TAG} into imageToBase64 fail err = ${JSON.stringify(err)}`);
      }
      fs.closeSync(file);
    }
    let base64Data;
    try {
      let file = fs.openSync(dstPath, fs.OpenMode.READ_ONLY);
      let stat = fs.lstatSync(dstPath);
      Logger.info(`${TAG} into imageToBase64 stat.size = ${stat.size}`);
      let buf = new ArrayBuffer(stat.size);
      fs.readSync(file.fd, buf);
      let unit8Array: Uint8Array = new Uint8Array(buf);
      let base64Helper = new util.Base64Helper();
      base64Data = base64Helper.encodeToStringSync(unit8Array, util.Type.BASIC);
      fs.closeSync(file);
      Logger.info(`${TAG} into imageToBase64 base64Data = ${base64Data}`);
    } catch (err) {
      Logger.error(`${TAG} into imageToBase64 err = ${JSON.stringify(err)}`);
    }
    return base64Data;
  }

  isImage(filePath: string): boolean {
    Logger.info(`${TAG} into isImage fileName = ${filePath}`);
    const imageExtensionsRegex = /\.(jpg|jpeg|png|gif|bmp|webp|heic)$/i;
    return imageExtensionsRegex.test(filePath);
  }

  async compressPictures(quality: number, forceJpg: boolean, sourceURL: Array<string>): Promise<Array<string>> {
    Logger.info(`${TAG} into compressPictures sourceURL = ${sourceURL} quality = ${quality} forceJpg = ${forceJpg}`);
    let imageType: string = 'jpg';
    let resultImages: Array<string> = new Array<string>();
    quality = (quality > 100) ? 100 : quality;
    for (let srcPath of sourceURL) {
      if (this.isImage(srcPath)) {
        Logger.info(`${TAG} into compressPictures img srcPath = ${srcPath}`);
        if (forceJpg) {
          imageType = 'jpg'
        } else {
          let i = srcPath.lastIndexOf('.');
          if (i != -1) {
            imageType = srcPath.substring(i + 1);
          }
        }
        Logger.info(`${TAG} into compressPictures imageType = ${imageType}`);
        let files = fs.openSync(srcPath, fs.OpenMode.READ_ONLY)
        let imageISs = image.createImageSource(files.fd);
        let imagePMs = await imageISs.createPixelMap();
        let imagePackerApi = await image.createImagePacker();
        let options: image.PackingOption = {
          format: 'image/jpeg',
          quality: quality,
        };
        try {
          let packerData = await imagePackerApi.packing(imagePMs, options);
          Logger.info(`${TAG} into compressPictures data = ${JSON.stringify(packerData)}`);
          let dstPath = this.ctx.uiAbilityContext.tempDir + '/rn_image_crop_picker_lib_temp_' + util.generateRandomUUID(true) + '.' + imageType;
          let newFile = fs.openSync(dstPath, fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE);
          Logger.info(`${TAG} into compressPictures newFile id = ${newFile.fd}`);
          const number = fs.writeSync(newFile.fd, packerData);
          Logger.info(`${TAG} into compressPictures write data to file succeed size = ${number}`);
          resultImages.push(dstPath);
          fs.closeSync(files);
        } catch (err) {
          Logger.error(`${TAG} into compressPictures write data to file failed err = ${JSON.stringify(err)}`);
        }
      } else {
        Logger.info(`${TAG} into compressPictures video srcPath = ${srcPath}`);
        resultImages.push(srcPath);
      }
    }
    return resultImages;
  }

  async getListFile(): Promise<FilePathResult> {
    let filePathResult: FilePathResult = { result: [] };
    let filesDir = this.ctx.uiAbilityContext.tempDir;

    class ListFileOption {
      public recursion: boolean = false;
      public listNum: number = 0;
      public filter: Filter = {};
    }

    let option = new ListFileOption();
    option.filter.suffix = ['.jpg'];
    option.filter.displayName = ['*'];
    option.filter.fileSizeOver = 0;
    option.filter.lastModifiedAfter = new Date(0).getTime();
    Logger.info(`${TAG} into getListFile filesDir = ${filesDir}`);
    let files = fs.listFileSync(filesDir, option);
    for (let i = 0; i < files.length; i++) {
      let listFilePath: FilePath = {}
      listFilePath.path = files[i];
      filePathResult.result.push(listFilePath);
    }
    Logger.info(`${TAG} into getListFile arrayList = ${JSON.stringify(filePathResult)}`);
    return filePathResult;
  }

  async cleanSingle(path: string): Promise<void> {
    Logger.info(`${TAG} into cleanSingle path = ${path}`);
    let filePath = path.trim();
    fs.access(filePath, (err) => {
      if (err) {
        Logger.info(`${TAG} cleanSingle access error data = ${err.data}`);
      } else {
        fs.unlink(filePath).then(() => {
          Logger.info(`${TAG} cleanSingle file succeed`);
        }).catch((err: BusinessError) => {
          Logger.error(`${TAG} cleanSingle err = ${JSON.stringify(err)}`);
        });
      }
    });
  }

  async clean(): Promise<void> {
    let dirPath = this.ctx.uiAbilityContext.tempDir;
    fs.rmdir(dirPath).then(() => {
      Logger.info(`${TAG} clean rmdir succeed`);
    }).catch((err: BusinessError) => {
      Logger.error(`${TAG} clean rmdir err = ${JSON.stringify(err)}`);
    });
  }

  async openCropper(options?: CropperOptions): Promise<Image> {
    Logger.info(`${TAG} into openCropper = ${JSON.stringify(options)}`);
    let path = options?.path;
    if (this.isNullOrUndefined(path?.trim())) {
      return new Promise(async (res, rej) => {
        rej('path is empty')
      })
    }
    let quality = options.compressImageQuality;
    if (!this.isNullOrUndefined(quality) && !(quality >= 0 && quality <= 1)) {
      return new Promise(async (res, rej) => {
        rej('quality is error')
      })
    }
    let result: Image = {
      data: null,
      cropRect: null,
      path: null,
      size: 0,
      width: 0,
      height: 0,
      mime: '',
      exif: null,
      localIdentifier: '',
      sourceURL: '',
      filename: '',
      creationDate: null,
      modificationDate: null
    };
    let includeExif = this.isNullOrUndefined(options?.includeExif) ? false : options?.includeExif;
    let writeTempFile = this.isNullOrUndefined(options?.writeTempFile) ? true : options?.writeTempFile;
    let qualityNumber = this.isNullOrUndefined(options.compressImageQuality) ? ImageQuality : options.compressImageQuality;
    let forceJpg = this.isNullOrUndefined(options.forceJpg) ? false : options.forceJpg;
    let imgPath = await this.intoCropper(path, options);
    Logger.info(`${TAG} into openCropper imgPath = ${imgPath}`);
    if (this.isNullOrUndefined(imgPath)) {
      return new Promise(async (res, rej) => {
        rej('imgPath is null')
      })
    }
    let tempFilePaths = null;
    let sourceFilePaths: Array<string> = [imgPath];
    if (qualityNumber !== 1 || forceJpg) {
      Logger.info(`${TAG} into openCropper qualityNumber = ${qualityNumber} forceJpg = ${forceJpg}`);
      tempFilePaths = await this.compressPictures(qualityNumber * 100, forceJpg, sourceFilePaths);
    } else {
      tempFilePaths = writeTempFile ? this.getTempFilePaths(sourceFilePaths) : null;
    }
    let tempFilePath = this.isNullOrUndefined(tempFilePaths) ? null : tempFilePaths[0];
    let exifInfo;
    // /\.(jpeg)$/i.test(path)
    if (includeExif) {
      try {
        let exifFile = fs.openSync(path, fs.OpenMode.READ_ONLY);
        let exifImageIS = image.createImageSource(exifFile.fd);
        exifInfo = await this.getImageExif(exifImageIS);
      } catch (err) {
        Logger.error(`${TAG} into openCamera err = ${JSON.stringify(err)}`);
      }
    }
    return new Promise(async (res, rej) => {
      this.getFileInfo(options?.includeBase64, imgPath, tempFilePath, exifInfo).then((imageInfo) => {
        result.path = this.isNullOrUndefined(tempFilePath) ? filePrefix + imgPath : filePrefix + tempFilePath;
        result.exif = imageInfo.exif;
        result.sourceURL = options?.path;
        result.data = imageInfo.data;
        result.size = imageInfo.size;
        result.width = imageInfo.width;
        result.height = imageInfo.height;
        result.filename = imageInfo.filename;
        result.mime = imageInfo.mime;
        result.localIdentifier = imageInfo.localIdentifier;
        result.cropRect = imageInfo.cropRect;
        result.creationDate = imageInfo.creationDate + '';
        result.modificationDate = imageInfo.modificationDate + '';
        res(result);
      })
    })
  }

  async getFileInfo(includeBase64: boolean, filePath: string, compressOrTempFilePath: string, exifInfo: Exif): Promise<VideoImageInfo> {
    let videoImageInfo: VideoImageInfo = { duration: null };
    let imageType;
    let i = this.isNullOrUndefined(compressOrTempFilePath) ? filePath.lastIndexOf('/') : compressOrTempFilePath.lastIndexOf('/')
    let fileName = this.isNullOrUndefined(compressOrTempFilePath) ? filePath.substring(i + 1) : compressOrTempFilePath.substring(i + 1)
    i = filePath.lastIndexOf('.')
    if (i != -1) {
      imageType = filePath.substring(i + 1)
    }
    videoImageInfo.path = this.isNullOrUndefined(compressOrTempFilePath) ? filePrefix + filePath : compressOrTempFilePath + filePath;
    videoImageInfo.filename = fileName;
    videoImageInfo.mime = 'image/' + imageType;

    let file = fs.openSync(filePath, fs.OpenMode.READ_ONLY)
    let stat = fs.statSync(file.fd);
    let length = stat.size;
    videoImageInfo.size = length;
    videoImageInfo.creationDate = stat.ctime;
    videoImageInfo.modificationDate = stat.mtime;
    if (this.isImage(filePath)) {
      let imageIS = image.createImageSource(file.fd)
      let imagePM = await imageIS.createPixelMap()
      let imgInfo = await imagePM.getImageInfo();
      videoImageInfo.data = includeBase64 ? this.imageToBase64(compressOrTempFilePath || filePath) : null;
      videoImageInfo.height = imgInfo.size.height;
      videoImageInfo.width = imgInfo.size.width;
      videoImageInfo.exif = exifInfo;
      imagePM.release().then(() => {
        imagePM = undefined;
      })
      imageIS.release().then(() => {
        imageIS = undefined;
      })
    } else {
      videoImageInfo.mime = 'video/' + imageType;
      let url = 'fd://' + file.fd;
      Logger.info(`${TAG} start avPlayer url = ${url}`);
      avMetadataExtractor = await media.createAVMetadataExtractor();
      avMetadataExtractor.fdSrc = { fd: file.fd, offset: 0, length: length };
      try {
        const res = await avMetadataExtractor.fetchMetadata();
        videoImageInfo.duration = res.duration;
        videoImageInfo.width = Number(res.videoWidth);
        videoImageInfo.height = Number(res.videoHeight);
      } catch (error) {
        Logger.error(`${TAG} get video info suc error = ${JSON.stringify(error)}`);
      }
    }

    videoImageInfo.cropRect = AppStorage.get('cropRect') as CropRect;

    fs.close(file.fd);
    return videoImageInfo;
  }

  async intoCropper(filePath: string, options?: Options | CropperOptions): Promise<string> {
    Logger.info(`${TAG} into intoCropper : filePath = ${filePath}`);
    let imagePath: string;
    const bundleName = this.ctx.uiAbilityContext.abilityInfo.bundleName;
    AppStorage.setOrCreate('filePath', filePath);
    return new Promise((res, rej) => {
      const initWidth: number = this.isNullOrUndefined(options?.width) ? 0 : options?.width;
      const initHeight: number = this.isNullOrUndefined(options?.height) ? 0 : options?.height;
      const enableRotationGesture: boolean = this.isNullOrUndefined(options?.enableRotationGesture) ? false : options?.enableRotationGesture;
      const title: string = this.isNullOrUndefined(options?.cropperToolbarTitle) ? '编辑图片' : options?.cropperToolbarTitle;
      const chooseText: string = this.isNullOrUndefined(options?.cropperChooseText) ? 'Choose' : options?.cropperChooseText;
      const chooseTextColor: string = this.isNullOrUndefined(options?.cropperChooseColor) ? '#FFCC00' : options?.cropperChooseColor;
      const cancelText: string = this.isNullOrUndefined(options?.cropperCancelText) ? 'Cancel' : options?.cropperCancelText;
      const cancelTextColor: string = this.isNullOrUndefined(options?.cropperCancelColor) ? '#0000FF' : options?.cropperCancelColor;
      const showCropGuidelines: boolean = this.isNullOrUndefined(options?.showCropGuidelines) ? true : options?.showCropGuidelines;
      const showCropFrame: boolean = this.isNullOrUndefined(options?.showCropFrame) ? true : options?.showCropFrame;
      const freeStyleCropEnabled: boolean = this.isNullOrUndefined(options?.freeStyleCropEnabled) ? false : options?.freeStyleCropEnabled;
      const cropperRotate: string = options?.cropperRotateButtonsHidden + '';
      AppStorage.setOrCreate('initWidth', initWidth);
      AppStorage.setOrCreate('initHeight', initHeight);
      AppStorage.setOrCreate('enableRotationGesture', enableRotationGesture);
      AppStorage.setOrCreate('textTitle', title);
      AppStorage.setOrCreate('chooseText', chooseText);
      AppStorage.setOrCreate('chooseTextColor', chooseTextColor);
      AppStorage.setOrCreate('cancelText', cancelText);
      AppStorage.setOrCreate('cancelTextColor', cancelTextColor);
      AppStorage.setOrCreate('cropperRotate', cropperRotate);
      AppStorage.setOrCreate('showCropGuidelines', showCropGuidelines);
      AppStorage.setOrCreate('showCropFrame', showCropFrame);
      AppStorage.setOrCreate('freeStyleCropEnabled', freeStyleCropEnabled);

      try {
        let want: Want = {
          "bundleName": bundleName,
          "abilityName": "ImageEditAbility",
        }
        this.ctx.uiAbilityContext.startAbilityForResult(want, (error, data) => {
          imagePath = AppStorage.get('cropImagePath') as string;
          AppStorage.setOrCreate('cropImagePath', '')
          Logger.info(`${TAG} into intoCropper startAbility suc imagePath = ${imagePath}`);
          res(imagePath);
        });
      } catch (err) {
        Logger.error(`${TAG} into intoCropper startAbility err = ${JSON.stringify(err)}`);
        res('')
      }
    });
  }

  async getImageExif(imageSource: image.ImageSource): Promise<Exif> {
    Logger.info(`${TAG} into getImageExif:`);
    let bitsPerSample;
    let orientation;
    let imageLength;
    let imageWidth;
    let gpsLatitude;
    let gpsLongitude;
    let gpsLatitudeRef;
    let gpsLongitudeRef;
    let dateTimeOriginal;
    let exposureTime;
    let sceneType;
    let isoSpeedRatings;
    let fNumber;
    try {
      bitsPerSample = await imageSource.getImageProperty(image.PropertyKey.BITS_PER_SAMPLE);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif bitsPerSample err = ${JSON.stringify(err)}`);
    }
    try {
      orientation = await imageSource.getImageProperty(image.PropertyKey.ORIENTATION);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif orientation err = ${JSON.stringify(err)}`);
    }
    try {
      imageLength = await imageSource.getImageProperty(image.PropertyKey.IMAGE_LENGTH);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif imageLength err = ${JSON.stringify(err)}`);
    }
    try {
      imageWidth = await imageSource.getImageProperty(image.PropertyKey.IMAGE_WIDTH);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif imageWidth err = ${JSON.stringify(err)}`);
    }
    try {
      gpsLatitude = await imageSource.getImageProperty(image.PropertyKey.GPS_LATITUDE);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif gpsLatitude err = ${JSON.stringify(err)}`);
    }
    try {
      gpsLongitude = await imageSource.getImageProperty(image.PropertyKey.GPS_LONGITUDE);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif gpsLongitude err = ${JSON.stringify(err)}`);
    }
    try {
      gpsLatitudeRef = await imageSource.getImageProperty(image.PropertyKey.GPS_LATITUDE_REF);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif gpsLatitudeRef err = ${JSON.stringify(err)}`);
    }
    try {
      gpsLongitudeRef = await imageSource.getImageProperty(image.PropertyKey.GPS_LONGITUDE_REF);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif gpsLongitudeRef err = ${JSON.stringify(err)}`);
    }
    try {
      dateTimeOriginal = await imageSource.getImageProperty(image.PropertyKey.DATE_TIME_ORIGINAL);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif dateTimeOriginal err = ${JSON.stringify(err)}`);
    }
    try {
      exposureTime = await imageSource.getImageProperty(image.PropertyKey.EXPOSURE_TIME);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif exposureTime err = ${JSON.stringify(err)}`);
    }
    try {
      sceneType = await imageSource.getImageProperty(image.PropertyKey.SCENE_TYPE);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif sceneType err = ${JSON.stringify(err)}`);
    }
    try {
      isoSpeedRatings = await imageSource.getImageProperty(image.PropertyKey.ISO_SPEED_RATINGS);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif isoSpeedRatings err = ${JSON.stringify(err)}`);
    }
    try {
      fNumber = await imageSource.getImageProperty(image.PropertyKey.F_NUMBER);
    } catch (err) {
      Logger.info(`${TAG} into getImageExif fNumber err = ${JSON.stringify(err)}`);
    }
    return {
      BitsPerSample: bitsPerSample,
      Orientation: orientation,
      ImageLength: imageLength,
      ImageWidth: imageWidth,
      GPSLatitude: gpsLatitude,
      GPSLongitude: gpsLongitude,
      GPSLatitudeRef: gpsLatitudeRef,
      GPSLongitudeRef: gpsLongitudeRef,
      DateTimeOriginal: dateTimeOriginal,
      ExposureTime: exposureTime,
      SceneType: sceneType,
      ISOSpeedRatings: isoSpeedRatings,
      FNumber: fNumber,
    }
  }

  grantPermission(): Promise<boolean> {
    Logger.info(`${TAG} into grantPermission:`);
    const permissions: Array<Permissions> = [
      'ohos.permission.READ_MEDIA',
      'ohos.permission.WRITE_MEDIA',
      'ohos.permission.MEDIA_LOCATION',
    ];
    return new Promise((res, rej) => {
      atManager.requestPermissionsFromUser(this.ctx.uiAbilityContext, permissions)
        .then((data: PermissionRequestResult) => {
          res(data?.authResults[0] === 0)
        }).catch((err) => {
          res(false)
          Logger.info(`${TAG} grantPermission err = ${JSON.stringify(err)}`);
        })
    });
  }
}