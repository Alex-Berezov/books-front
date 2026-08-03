'use client';

import { useState, useMemo, type FC } from 'react';
import { Card, Button, Input, Select, Checkbox, Typography, Space, message, Alert } from 'antd';
import { useCreateBookFromClearance } from '@/api/hooks/useRightsIntakes';
import { generateSlug } from '@/lib/utils/slug';
import type {
  RightsIntake,
  RightsProfileDetail,
  CreateBookFromClearanceRequest,
  CreateBookFromClearanceResponse,
  CreateBookFromClearanceVersion,
} from '@/types/api-schema/rights-intake';
import { bookCreationErrorMessage, type BookCreationErrorBody } from './bookCreationErrorLabels';
import styles from './CreateBookFromClearanceForm.module.scss';

const { TextArea } = Input;
const { Title, Text } = Typography;

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  ru: 'Russian',
};

const VERSION_TYPES = [
  { label: 'Text', value: 'text' },
  { label: 'Audio', value: 'audio' },
  { label: 'Referral', value: 'referral' },
];

interface CreateBookFromClearanceFormProps {
  intakeId: string;
  intake: RightsIntake;
  currentProfile?: RightsProfileDetail;
  onSuccess: (response: CreateBookFromClearanceResponse) => void;
}

interface VersionFormState {
  language: string;
  title: string;
  author: string;
  type: string;
  isFree: boolean;
  referralUrl: string;
  primaryCategoryId: string;
  firstPublishedYear: string;
  editionPublishedYear: string;
  originalLanguage: string;
  originalTitle: string;
  copyrightStatus: string;
  authorPageUrl: string;
  authorId: string;
  shortDescription: string;
  summaryShort: string;
  coverAlt: string;
}

const createInitialVersions = (intake: RightsIntake): VersionFormState[] => {
  const langs =
    intake.targetLanguages && intake.targetLanguages.length > 0 ? intake.targetLanguages : ['en'];

  return langs.map((lang) => ({
    language: lang,
    title: intake.candidateTitle,
    author: intake.candidateAuthor,
    type: 'text',
    isFree: false,
    referralUrl: '',
    primaryCategoryId: '',
    firstPublishedYear: '',
    editionPublishedYear: '',
    originalLanguage: intake.originalLanguage || '',
    originalTitle: intake.originalTitle || '',
    copyrightStatus: '',
    authorPageUrl: '',
    authorId: '',
    shortDescription: '',
    summaryShort: '',
    coverAlt: '',
  }));
};

const createSingleVersion = (intake: RightsIntake, defaultLang: string): VersionFormState => ({
  language: defaultLang,
  title: intake.candidateTitle,
  author: intake.candidateAuthor,
  type: 'text',
  isFree: false,
  referralUrl: '',
  primaryCategoryId: '',
  firstPublishedYear: '',
  editionPublishedYear: '',
  originalLanguage: intake.originalLanguage || '',
  originalTitle: intake.originalTitle || '',
  copyrightStatus: '',
  authorPageUrl: '',
  authorId: '',
  shortDescription: '',
  summaryShort: '',
  coverAlt: '',
});

export const CreateBookFromClearanceForm: FC<CreateBookFromClearanceFormProps> = (props) => {
  const { intakeId, intake, currentProfile, onSuccess } = props;

  const initialSlug = useMemo(() => generateSlug(intake.candidateTitle), [intake.candidateTitle]);

  const [slug, setSlug] = useState(initialSlug);
  const [attachToExistingBook, setAttachToExistingBook] = useState(false);
  const [versions, setVersions] = useState<VersionFormState[]>(() => createInitialVersions(intake));

  const createBookMutation = useCreateBookFromClearance({
    onSuccess: (response) => {
      message.success(
        attachToExistingBook
          ? 'Clearance attached to the existing book'
          : 'Book created successfully'
      );
      onSuccess(response);
    },
    // WP-H: отказ несёт машинный код — показываем причину, а не английскую строку сервера.
    onError: (error) => {
      const body = (error as { data?: BookCreationErrorBody })?.data;
      message.error(
        bookCreationErrorMessage(body, error instanceof Error ? error.message : undefined)
      );
    },
  });

  const handleSlugChange = (value: string) => {
    setSlug(generateSlug(value));
  };

  const handleVersionFieldChange = (
    index: number,
    field: keyof VersionFormState,
    value: string | boolean
  ) => {
    setVersions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddVersion = () => {
    const usedLanguages = new Set(versions.map((version) => version.language));
    const availableLanguage = intake.targetLanguages.find(
      (language) => !usedLanguages.has(language)
    );
    const newVersion = createSingleVersion(intake, availableLanguage || '');
    setVersions((prev) => [...prev, newVersion]);
  };

  const handleRemoveVersion = (index: number) => {
    setVersions((prev) => prev.filter((_, versionIndex) => versionIndex !== index));
  };

  const hasDuplicateLanguages = useMemo(() => {
    const langs = versions.map((v) => v.language).filter(Boolean);
    return new Set(langs).size !== langs.length;
  }, [versions]);

  const rightsSummary = useMemo(() => {
    if (!currentProfile) {
      return { allowed: 0, blocked: 0, licenseRequired: 0, pending: 0, actions: 0 };
    }
    const decisions = currentProfile.territoryDecisions;
    const allowed = decisions.filter((decision) => decision.finalStatus === 'ALLOWED').length;
    const blocked = decisions.filter(
      (decision) => decision.finalStatus === 'BLOCKED' || decision.accessPolicy === 'BLOCK'
    ).length;
    const licenseRequired = decisions.filter(
      (decision) => decision.finalStatus === 'LICENSE_REQUIRED'
    ).length;
    const pending = decisions.filter(
      (decision) => decision.finalStatus === 'PENDING' || decision.finalStatus === 'UNCERTAIN'
    ).length;
    const actions = currentProfile.actions.length;
    return { allowed, blocked, licenseRequired, pending, actions };
  }, [currentProfile]);

  const buildRequest = (): CreateBookFromClearanceRequest => {
    const requestVersions: CreateBookFromClearanceVersion[] = versions.map((version) => {
      const base: CreateBookFromClearanceVersion = {
        language: version.language,
        title: version.title,
        author: version.author,
        type: version.type,
        isFree: version.isFree,
      };
      if (version.referralUrl) base.referralUrl = version.referralUrl;
      if (version.primaryCategoryId) base.primaryCategoryId = version.primaryCategoryId;
      if (version.firstPublishedYear) base.firstPublishedYear = Number(version.firstPublishedYear);
      if (version.editionPublishedYear)
        base.editionPublishedYear = Number(version.editionPublishedYear);
      if (version.originalLanguage) base.originalLanguage = version.originalLanguage;
      if (version.originalTitle) base.originalTitle = version.originalTitle;
      if (version.copyrightStatus) base.copyrightStatus = version.copyrightStatus;
      if (version.authorPageUrl) base.authorPageUrl = version.authorPageUrl;
      if (version.authorId) base.authorId = version.authorId;
      if (version.shortDescription) base.shortDescription = version.shortDescription;
      if (version.summaryShort) base.summaryShort = version.summaryShort;
      if (version.coverAlt) base.coverAlt = version.coverAlt;
      return base;
    });
    // WP-L.2: при привязке версии не передаются — снимок прав ложится на уже заведённые.
    return attachToExistingBook
      ? { slug, attachToExistingBook: true }
      : { slug, versions: requestVersions };
  };

  // WP-L.1: описание и обложка больше не проверяются — их здесь нет. Обязательный минимум версии
  // — то, что относится к правам и к идентификации издания.
  const isVersionValid = (version: VersionFormState): boolean => {
    return (
      !!version.language && !!version.title.trim() && !!version.author.trim() && !!version.type
    );
  };

  const allVersionsValid = versions.length > 0 && versions.every(isVersionValid);
  const isSlugValid = slug.trim().length > 0;
  const canSubmit =
    isSlugValid &&
    (attachToExistingBook || (allVersionsValid && !hasDuplicateLanguages)) &&
    !createBookMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const request = buildRequest();
    createBookMutation.mutate({ intakeId, data: request });
  };

  const getLanguageOptions = (currentIndex: number) => {
    const usedOtherLangs = new Set(
      versions.filter((_, idx) => idx !== currentIndex).map((v) => v.language)
    );
    return intake.targetLanguages.map((language) => ({
      label: LANG_LABELS[language] || language.toUpperCase(),
      value: language,
      disabled: usedOtherLangs.has(language),
    }));
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Title level={5} className={styles.cardTitle}>
          Create Book from Approved Clearance
        </Title>

        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Book Slug<span className={styles.required}>*</span>
            </label>
            <Input
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="book-slug"
              status={!isSlugValid && slug.length > 0 ? 'error' : undefined}
            />
            <Text type="secondary" className={styles.slugHint}>
              {attachToExistingBook
                ? 'Slug of the book to attach the clearance to — the one from its public URL (version slug) or the legacy book slug'
                : `Generated from: ${intake.candidateTitle}`}
            </Text>
          </div>

          {/* WP-L.2 (переходное): у книг, заведённых до системы прав, нет способа получить профиль
              — без него гейт публикации закрыт навсегда. Убрать вместе с бэкфиллом старых книг. */}
          <div className={styles.field}>
            <Checkbox
              checked={attachToExistingBook}
              onChange={(event) => setAttachToExistingBook(event.target.checked)}
            >
              Attach the clearance to an existing book with this slug
            </Checkbox>
          </div>

          {attachToExistingBook ? (
            <Alert
              type="info"
              showIcon
              message="Existing book mode"
              description="No versions are created. The rights snapshot is written onto the versions this book already has in the target languages of the clearance; versions in other languages stay untouched and remain blocked by the gate."
            />
          ) : (
            <div className={styles.sectionDivider}>
              Versions (Target Languages: {intake.targetLanguages.join(', ')})
            </div>
          )}

          {!attachToExistingBook &&
            versions.map((version, index) => (
              <div key={index} className={styles.fieldGroup}>
                <Text strong>
                  Version {index + 1}:{' '}
                  {LANG_LABELS[version.language] || version.language.toUpperCase()}
                </Text>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>
                      Language<span className={styles.required}>*</span>
                    </label>
                    <Select
                      value={version.language}
                      onChange={(value) => handleVersionFieldChange(index, 'language', value)}
                      options={getLanguageOptions(index)}
                      placeholder="Select language"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>
                      Type<span className={styles.required}>*</span>
                    </label>
                    <Select
                      value={version.type}
                      onChange={(value) => handleVersionFieldChange(index, 'type', value)}
                      options={VERSION_TYPES}
                      placeholder="Select type"
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>
                      Title<span className={styles.required}>*</span>
                    </label>
                    <Input
                      value={version.title}
                      onChange={(event) =>
                        handleVersionFieldChange(index, 'title', event.target.value)
                      }
                      placeholder="Book title"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>
                      Author<span className={styles.required}>*</span>
                    </label>
                    <Input
                      value={version.author}
                      onChange={(event) =>
                        handleVersionFieldChange(index, 'author', event.target.value)
                      }
                      placeholder="Author name"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <Checkbox
                    checked={version.isFree}
                    onChange={(event) =>
                      handleVersionFieldChange(index, 'isFree', event.target.checked)
                    }
                  >
                    Free
                  </Checkbox>
                </div>

                <details>
                  <summary>Optional fields</summary>
                  <Space direction="vertical" size="middle" className={styles.optionalFieldsSpace}>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Referral URL</label>
                        <Input
                          value={version.referralUrl}
                          onChange={(event) =>
                            handleVersionFieldChange(index, 'referralUrl', event.target.value)
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Primary Category ID</label>
                        <Input
                          value={version.primaryCategoryId}
                          onChange={(event) =>
                            handleVersionFieldChange(index, 'primaryCategoryId', event.target.value)
                          }
                          placeholder="Category UUID"
                        />
                      </div>
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>First Published Year</label>
                        <Input
                          type="number"
                          value={version.firstPublishedYear}
                          onChange={(event) =>
                            handleVersionFieldChange(
                              index,
                              'firstPublishedYear',
                              event.target.value
                            )
                          }
                          placeholder="1850"
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Edition Published Year</label>
                        <Input
                          type="number"
                          value={version.editionPublishedYear}
                          onChange={(event) =>
                            handleVersionFieldChange(
                              index,
                              'editionPublishedYear',
                              event.target.value
                            )
                          }
                          placeholder="2024"
                        />
                      </div>
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Original Language</label>
                        <Input
                          value={version.originalLanguage}
                          onChange={(event) =>
                            handleVersionFieldChange(index, 'originalLanguage', event.target.value)
                          }
                          placeholder="fr"
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Original Title</label>
                        <Input
                          value={version.originalTitle}
                          onChange={(event) =>
                            handleVersionFieldChange(index, 'originalTitle', event.target.value)
                          }
                          placeholder="Original title"
                        />
                      </div>
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Copyright Status</label>
                        <Input
                          value={version.copyrightStatus}
                          onChange={(event) =>
                            handleVersionFieldChange(index, 'copyrightStatus', event.target.value)
                          }
                          placeholder="public_domain"
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Author Page URL</label>
                        <Input
                          value={version.authorPageUrl}
                          onChange={(event) =>
                            handleVersionFieldChange(index, 'authorPageUrl', event.target.value)
                          }
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Author ID</label>
                        <Input
                          value={version.authorId}
                          onChange={(event) =>
                            handleVersionFieldChange(index, 'authorId', event.target.value)
                          }
                          placeholder="Author UUID"
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Cover Alt Text</label>
                        <Input
                          value={version.coverAlt}
                          onChange={(event) =>
                            handleVersionFieldChange(index, 'coverAlt', event.target.value)
                          }
                          placeholder="Cover description"
                        />
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Short Description</label>
                      <TextArea
                        rows={2}
                        value={version.shortDescription}
                        onChange={(event) =>
                          handleVersionFieldChange(index, 'shortDescription', event.target.value)
                        }
                        placeholder="Short description"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Summary Short</label>
                      <TextArea
                        rows={2}
                        value={version.summaryShort}
                        onChange={(event) =>
                          handleVersionFieldChange(index, 'summaryShort', event.target.value)
                        }
                        placeholder="Short summary"
                      />
                    </div>
                  </Space>
                </details>

                {versions.length > 1 && (
                  <Button danger size="small" onClick={() => handleRemoveVersion(index)}>
                    Remove Version
                  </Button>
                )}
              </div>
            ))}

          {!attachToExistingBook && versions.length < intake.targetLanguages.length && (
            <Button type="dashed" onClick={handleAddVersion}>
              Add Another Version Language
            </Button>
          )}

          {currentProfile && (
            <>
              <div className={styles.sectionDivider}>Rights Summary (read-only)</div>
              <div className={styles.rightsSummary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Allowed Countries</span>
                  <span className={styles.summaryValue}>{rightsSummary.allowed}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Blocked Countries</span>
                  <span className={styles.summaryValue}>{rightsSummary.blocked}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>License Required</span>
                  <span className={styles.summaryValue}>{rightsSummary.licenseRequired}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Pending</span>
                  <span className={styles.summaryValue}>{rightsSummary.pending}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Required Actions</span>
                  <span className={styles.summaryValue}>{rightsSummary.actions}</span>
                </div>
              </div>
            </>
          )}

          {!isSlugValid && slug.length > 0 && (
            <Alert type="error" message="Slug is required" showIcon />
          )}
          {!attachToExistingBook && hasDuplicateLanguages && (
            <Alert
              type="error"
              message="Duplicate language selection. Each version row must have a unique target language."
              showIcon
            />
          )}
          {!attachToExistingBook && versions.length === 0 && (
            <Alert type="warning" message="At least one version is required" showIcon />
          )}
          {!attachToExistingBook && versions.length > 0 && !allVersionsValid && (
            <Alert
              type="warning"
              message="Fill all required version fields for each language row"
              showIcon
            />
          )}

          <div className={styles.actions}>
            <Button
              type="primary"
              size="large"
              loading={createBookMutation.isPending}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {attachToExistingBook ? 'Attach Clearance' : 'Create Book'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
